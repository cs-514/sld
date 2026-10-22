import { readFileSync } from "node:fs";
import path from "node:path";
import { formGroup } from "./forms";

type FilingTuple = [string, string, string, string, string];

export interface Filing {
  form: string;
  filed: string;
  report: string;
  accession: string;
  document: string;
  description: string;
  group: string;
}

export interface TickerRef {
  ticker: string;
  exchange: string;
  slug: string;
}

interface CompanyRecord {
  cik: number;
  cikPadded: string;
  name: string;
  tickers: TickerRef[];
  sic: string;
  sicDescription: string;
  category: string;
  fiscalYearEnd: string;
  stateOfIncorporation: string;
  formerNames: { name: string; to: string }[];
  filings: Array<Filing | FilingTuple>;
  error: string | null;
}

export interface Company {
  cik: number;
  cikPadded: string;
  name: string;
  tickers: TickerRef[];
  sic: string;
  sicDescription: string;
  category: string;
  fiscalYearEnd: string;
  stateOfIncorporation: string;
  formerNames: { name: string; to: string }[];
  filings: Filing[];
  error: string | null;
}

export interface EdgarFile {
  generatedAt: string;
  source: string;
  tickerSource: string;
  userAgent: string;
  note: string;
  companyCount: number;
  withFilings: number;
  companies: Record<string, CompanyRecord>;
}

let cached: EdgarFile | null = null;
let normalizedCache: Company[] | null = null;
let slugIndex: Map<string, { company: Company; ticker: TickerRef }> | null = null;

export function loadEdgar(): EdgarFile {
  if (cached) return cached;
  const file = path.join(process.cwd(), "src/data/edgar/companies.json");
  try {
    cached = JSON.parse(readFileSync(file, "utf8")) as EdgarFile;
  } catch (error) {
    throw new Error(`Missing EDGAR snapshot at ${file}. Run npm run data:edgar. ${String(error)}`);
  }
  return cached;
}

function normalizeFiling(filing: Filing | FilingTuple): Filing {
  if (Array.isArray(filing)) {
    const [form, filed, report, accession, document] = filing;
    return { form, filed, report, accession, document, description: "", group: formGroup(form) };
  }
  return { ...filing, group: filing.group || formGroup(filing.form) };
}

function normalizeCompany(company: CompanyRecord): Company {
  return { ...company, filings: company.filings.map(normalizeFiling) };
}

export function companiesByCik(): Company[] {
  if (!normalizedCache) {
    normalizedCache = Object.values(loadEdgar().companies).map(normalizeCompany);
  }
  return normalizedCache;
}

function indexBySlug(): Map<string, { company: Company; ticker: TickerRef }> {
  if (!slugIndex) {
    slugIndex = new Map();
    for (const company of companiesByCik()) {
      for (const ticker of company.tickers) slugIndex.set(ticker.slug, { company, ticker });
    }
  }
  return slugIndex;
}

export function companyBySlug(slug: string): { company: Company; ticker: TickerRef } | undefined {
  return indexBySlug().get(slug);
}

export function companyByCik(cik: string): Company | undefined {
  const numeric = String(Number(cik));
  const record = loadEdgar().companies[numeric] || loadEdgar().companies[cik];
  return record ? normalizeCompany(record) : undefined;
}
