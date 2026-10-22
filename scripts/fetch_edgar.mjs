#!/usr/bin/env node
/**
 * Build a static EDGAR issuer index and a compact filings snapshot.
 *
 * SEC fair access: https://www.sec.gov/os/webmaster-faq#developers
 * Requests send a descriptive User-Agent and stay under 10 requests/second.
 * data.sec.gov does not reliably allow browser fetches (no guaranteed CORS,
 * and browsers cannot set the required User-Agent), so the site reads this
 * snapshot from the same origin and deep-links to EDGAR for the live file.
 */

import { mkdir, readFile, writeFile, appendFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = path.join(ROOT, "data", "cache");
const OUT_DIR = path.join(ROOT, "src", "data", "edgar");
const PUBLIC_DIR = path.join(ROOT, "public", "data");
const JSONL = path.join(CACHE, "edgar-filings.jsonl");

const UA =
  "PinpointResearchBot/1.0 (securities research desk; contact: pinpoint-research@example.com)";
const TICKER_URL = "https://www.sec.gov/files/company_tickers.json";
const EXCHANGE_URL = "https://www.sec.gov/files/company_tickers_exchange.json";
const RATE_PER_SEC = 8;
const PRIORITY = new Set([320193, 789019, 19617]); // AAPL, MSFT, JPM

const CAPS = {
  "10-K": 10,
  "10-Q": 12,
  "8-K": 15,
  "S-1": 6,
  "S-3": 6,
  proxy: 8,
  "13dg": 8,
  s16: 6,
  reg: 8,
  other: 8,
};

function formGroup(form) {
  const f = String(form || "").toUpperCase();
  if (/^(10-K|10-KT|20-F|40-F|NT 10-K|NT 20-F)/.test(f)) return "10-K";
  if (/^(10-Q|10-QT|NT 10-Q)/.test(f)) return "10-Q";
  if (/^(8-K|6-K)/.test(f)) return "8-K";
  if (/^S-1/.test(f)) return "S-1";
  if (/^S-3/.test(f)) return "S-3";
  if (/^(DEF 14A|DEFA14A|DEFR14A|DEFM14A|DEFC14A|PRE 14A|PREC14A|PREM14A|PRER14A|DFAN14A)/.test(f))
    return "proxy";
  if (/^(SC 13[DG]|SCHEDULE 13[DG])/.test(f)) return "13dg";
  if (/^[345](\/A)?$/.test(f)) return "s16";
  if (/^(S-4|S-8|S-11|F-1|F-3|F-4|F-10|424B|POS AM|8-A|EFFECT|FWP)/.test(f)) return "reg";
  return "other";
}

function tickerSlug(ticker) {
  return String(ticker)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function padCik(cik) {
  return String(cik).padStart(10, "0");
}

async function fetchJson(url, attempt = 0) {
  const response = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(30000),
  });
  if ((response.status === 429 || response.status >= 500) && attempt < 4) {
    const wait = 1000 * 2 ** attempt + Math.floor(Math.random() * 400);
    await new Promise((r) => setTimeout(r, wait));
    return fetchJson(url, attempt + 1);
  }
  if (!response.ok) {
    const error = new Error(`${response.status} ${url}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function makeLimiter(perSec) {
  const gap = 1000 / perSec;
  let next = Date.now();
  let chain = Promise.resolve();
  return () => {
    const run = chain.then(async () => {
      const now = Date.now();
      const slot = Math.max(now, next);
      next = slot + gap;
      const delay = slot - now;
      if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    });
    chain = run.catch(() => {});
    return run;
  };
}

function selectFilings(columns) {
  const count = columns?.form?.length || 0;
  const buckets = Object.fromEntries(Object.keys(CAPS).map((key) => [key, []]));
  const seen = new Set();
  for (let i = 0; i < count; i += 1) {
    const form = columns.form[i];
    const accession = columns.accessionNumber[i];
    if (!form || !accession || seen.has(accession)) continue;
    const group = formGroup(form);
    const cap = CAPS[group] ?? CAPS.other;
    if (buckets[group].length >= cap) continue;
    seen.add(accession);
    const desc = String(columns.primaryDocDescription?.[i] || "").replace(/\s+/g, " ").trim();
    buckets[group].push({
      form,
      filed: columns.filingDate[i] || "",
      report: columns.reportDate?.[i] || "",
      accession,
      document: columns.primaryDocument?.[i] || "",
      description: desc && desc.toUpperCase() !== form.toUpperCase() ? desc.slice(0, 80) : "",
      group,
    });
  }
  return Object.values(buckets)
    .flat()
    .sort((a, b) => (a.filed < b.filed ? 1 : a.filed > b.filed ? -1 : 0));
}

function columnSource(json) {
  if (json?.filings?.recent?.form) return json.filings.recent;
  if (json?.form && json?.accessionNumber) return json;
  return null;
}

async function loadIssuers() {
  const [tickersJson, exchangeJson] = await Promise.all([
    fetchJson(TICKER_URL),
    fetchJson(EXCHANGE_URL),
  ]);
  const exchangeByTicker = new Map();
  for (const row of exchangeJson.data || []) {
    const [cik, name, ticker, exchange] = row;
    if (!ticker) continue;
    exchangeByTicker.set(String(ticker).toUpperCase(), {
      cik: Number(cik),
      name,
      exchange: exchange || "",
    });
  }

  const byCik = new Map();
  const rows = Object.values(tickersJson);
  for (const row of rows) {
    const cik = Number(row.cik_str);
    const ticker = String(row.ticker || "").toUpperCase();
    if (!cik || !ticker) continue;
    const extra = exchangeByTicker.get(ticker);
    if (!byCik.has(cik)) {
      byCik.set(cik, {
        cik,
        cikPadded: padCik(cik),
        name: row.title || extra?.name || "",
        tickers: [],
      });
    }
    const company = byCik.get(cik);
    company.tickers.push({
      ticker,
      exchange: extra?.exchange || "",
      slug: tickerSlug(ticker),
    });
  }

  // Issuers present on the exchange file but missing from company_tickers.json.
  for (const [ticker, extra] of exchangeByTicker) {
    if (!extra.cik) continue;
    let company = byCik.get(extra.cik);
    if (!company) {
      company = {
        cik: extra.cik,
        cikPadded: padCik(extra.cik),
        name: extra.name || ticker,
        tickers: [],
      };
      byCik.set(extra.cik, company);
    }
    if (!company.tickers.some((t) => t.ticker === ticker)) {
      company.tickers.push({ ticker, exchange: extra.exchange || "", slug: tickerSlug(ticker) });
    }
  }

  const usedSlugs = new Map();
  for (const company of byCik.values()) {
    company.tickers.sort((a, b) => a.ticker.localeCompare(b.ticker));
    for (const ticker of company.tickers) {
      const owner = usedSlugs.get(ticker.slug);
      if (owner && owner !== company.cik) ticker.slug = `${ticker.slug}-${company.cik}`;
      usedSlugs.set(ticker.slug, company.cik);
    }
  }
  return byCik;
}

async function loadCheckpoint() {
  const done = new Map();
  try {
    const raw = await readFile(JSONL, "utf8");
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line);
        if (row?.cik) done.set(Number(row.cik), row);
      } catch {
        // Ignore a torn final line from an interrupted run.
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return done;
}

async function fetchCompany(cik, limit) {
  const padded = padCik(cik);
  const url = `https://data.sec.gov/submissions/CIK${padded}.json`;
  const json = await fetchJson(url);
  let columns = columnSource(json);
  let filings = columns ? selectFilings(columns) : [];
  const hasAnnual = filings.some((row) => row.group === "10-K");
  const older = json?.filings?.files?.[0]?.name;
  if (!hasAnnual && older) {
    try {
      if (limit) await limit();
      const extra = await fetchJson(`https://data.sec.gov/submissions/${older}`);
      const extraColumns = columnSource(extra);
      if (extraColumns) {
        const merged = {
          form: [...(columns?.form || []), ...extraColumns.form],
          filingDate: [...(columns?.filingDate || []), ...extraColumns.filingDate],
          reportDate: [...(columns?.reportDate || []), ...(extraColumns.reportDate || [])],
          accessionNumber: [...(columns?.accessionNumber || []), ...extraColumns.accessionNumber],
          primaryDocument: [...(columns?.primaryDocument || []), ...(extraColumns.primaryDocument || [])],
          primaryDocDescription: [
            ...(columns?.primaryDocDescription || []),
            ...(extraColumns.primaryDocDescription || []),
          ],
        };
        filings = selectFilings(merged);
      }
    } catch {
      // The recent list is enough when the historical shard fails.
    }
  }
  const former = Array.isArray(json.formerNames) ? json.formerNames.slice(0, 3) : [];
  return {
    cik: Number(cik),
    name: json.name || "",
    sic: json.sic || "",
    sicDescription: json.sicDescription || "",
    category: json.category || "",
    fiscalYearEnd: json.fiscalYearEnd || "",
    stateOfIncorporation: json.stateOfIncorporation || "",
    formerNames: former.map((item) => ({ name: item.name, to: item.to || "" })),
    filings,
    error: null,
  };
}

function compile(byCik, snapshots, generatedAt) {
  const companies = {};
  const issuers = [];
  for (const company of byCik.values()) {
    const snap = snapshots.get(company.cik);
    const filings = (snap?.filings || []).map((filing) =>
      Array.isArray(filing)
        ? filing
        : [filing.form, filing.filed, filing.report || "", filing.accession, filing.document || ""],
    );
    const record = {
      cik: company.cik,
      cikPadded: company.cikPadded,
      name: snap?.name || company.name,
      tickers: company.tickers,
      sic: snap?.sic || "",
      sicDescription: snap?.sicDescription || "",
      category: snap?.category || "",
      fiscalYearEnd: snap?.fiscalYearEnd || "",
      stateOfIncorporation: snap?.stateOfIncorporation || "",
      formerNames: snap?.formerNames || [],
      filings,
      error: snap?.error || null,
    };
    companies[company.cik] = record;
    for (const ticker of company.tickers) {
      issuers.push([ticker.ticker, record.name, company.cik, ticker.exchange, ticker.slug]);
    }
  }
  issuers.sort((a, b) => a[0].localeCompare(b[0]));
  return {
    companies: {
      generatedAt,
      source: "https://data.sec.gov/submissions/CIK##########.json",
      tickerSource: TICKER_URL,
      userAgent: UA,
      note: "Each issuer keeps a capped set of recent filings from the SEC submissions 'recent' list (about the latest 1,000 filings), plus one older shard when that list has no annual report. This is a snapshot, not a live feed.",
      companyCount: Object.keys(companies).length,
      withFilings: Object.values(companies).filter((c) => c.filings.length).length,
      companies,
    },
    issuers,
  };
}

async function writeOutputs(byCik, snapshots) {
  const generatedAt = new Date().toISOString();
  const { companies, issuers } = compile(byCik, snapshots, generatedAt);
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(PUBLIC_DIR, { recursive: true });
  await writeFile(path.join(OUT_DIR, "companies.json"), JSON.stringify(companies));
  await writeFile(path.join(PUBLIC_DIR, "issuers.json"), JSON.stringify(issuers));
  return companies;
}

async function main() {
  await mkdir(CACHE, { recursive: true });
  console.log("Loading ticker files…");
  const byCik = await loadIssuers();
  const snapshots = await loadCheckpoint();
  console.log(`Issuers: ${byCik.size} CIKs, checkpoint ${snapshots.size}`);
  await writeOutputs(byCik, snapshots);

  const queue = [...byCik.keys()].filter((cik) => !snapshots.has(cik));
  queue.sort((a, b) => {
    const ap = PRIORITY.has(a) ? 0 : 1;
    const bp = PRIORITY.has(b) ? 0 : 1;
    if (ap !== bp) return ap - bp;
    return a - b;
  });
  console.log(`Fetching ${queue.length} submission files at ${RATE_PER_SEC}/sec`);

  const limit = makeLimiter(RATE_PER_SEC);
  let cursor = 0;
  let done = 0;
  let failed = 0;
  let writeChain = Promise.resolve();
  const persist = (record) => {
    writeChain = writeChain.then(() => appendFile(JSONL, JSON.stringify(record) + "\n"));
    return writeChain;
  };
  const workers = Array.from({ length: 8 }, async () => {
    while (cursor < queue.length) {
      const index = cursor;
      cursor += 1;
      const cik = queue[index];
      await limit();
      let record;
      try {
        record = await fetchCompany(cik, limit);
      } catch (error) {
        failed += 1;
        record = { cik, name: "", filings: [], error: String(error.message || error) };
      }
      snapshots.set(cik, record);
      await persist(record);
      done += 1;
      if (done % 200 === 0 || PRIORITY.has(cik)) {
        const sample = byCik.get(cik);
        console.log(
          `${done}/${queue.length} ${sample?.tickers?.[0]?.ticker || cik} filings=${record.filings.length} failed=${failed}`,
        );
      }
      if (done % 500 === 0) await writeOutputs(byCik, snapshots);
    }
  });
  await Promise.all(workers);
  const compiled = await writeOutputs(byCik, snapshots);
  console.log(
    `Done. ${compiled.companyCount} companies, ${compiled.withFilings} with filings, ${failed} errors.`,
  );
  if (!snapshots.has(320193) || !(snapshots.get(320193).filings || []).length) {
    throw new Error("AAPL snapshot is missing filings");
  }
}

const lock = path.join(CACHE, "edgar-fetch.lock");
try {
  await access(lock);
} catch {
  // no lock yet
}
await mkdir(CACHE, { recursive: true });
await main();
