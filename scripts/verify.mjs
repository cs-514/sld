#!/usr/bin/env node
/**
 * Checks the statute index, the EDGAR snapshot, and (when dist/ exists)
 * that the built site is rooted at /sld/.
 * Pass --links to HEAD a sample of official statute URLs.
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SEC_USER_AGENT } from "./user-agent.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const links = process.argv.includes("--links");
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    failed += 1;
    console.error(`FAIL ${message}`);
  }
}

function load(relative) {
  return JSON.parse(readFileSync(path.join(ROOT, relative), "utf8"));
}

const expected = {
  "33-act": {
    5: "77e",
    4: "77d",
    "4A": "77d-1",
    2: "77b",
    11: "77k",
    12: "77l",
    17: "77q",
    "27B": "77z-2a",
    29: "77z-4",
  },
  "34-act": {
    10: "78j",
    "10A": "78j-1",
    "10B": "78j-2",
    "10D": "78j-4",
    12: "78l",
    13: "78m",
    14: "78n",
    "14A": "78n-1",
    "15D": "78o-6",
    "15E": "78o-7",
    16: "78p",
    "21F": "78u-6",
    "30A": "78dd-1",
    41: "78rr",
  },
  tia: { 301: "77aaa", 304: "77ddd", 328: "77bbbb" },
};

for (const [actId, map] of Object.entries(expected)) {
  const file = load(`src/data/statutes/${actId}.json`);
  const bySection = new Map(
    file.sections.filter((section) => section.actSection).map((section) => [section.actSection, section]),
  );
  for (const [actSection, usc] of Object.entries(map)) {
    const section = bySection.get(String(actSection));
    assert(section, `${actId} § ${actSection} missing`);
    assert(section?.uscSlug === usc, `${actId} § ${actSection} -> ${section?.uscSlug}, expected ${usc}`);
    if (!section) continue;
    assert(section.heading, `${actId} § ${actSection} has no heading`);
    assert(section.links.house.includes(`section${usc}`), `House link for § ${actSection}`);
    assert(section.links.govinfo === `https://www.govinfo.gov/link/uscode/15/${usc}`, `govinfo link § ${actSection}`);
    assert(section.links.lii === `https://www.law.cornell.edu/uscode/text/15/${usc}`, `LII link § ${actSection}`);
    assert(section.path === `/${actId}/${section.slug}/`, `path for § ${actSection}`);
  }
  const slugs = file.sections.map((section) => section.slug);
  assert(new Set(slugs).size === slugs.length, `${actId} duplicate slugs`);
  for (const section of file.sections) {
    assert(section.heading !== undefined, `heading ${section.uscSlug}`);
    assert(!/SAFE HARBOR FOR INVESTMENT FUND RESEARCH/.test(section.heading), "nested note indexed");
    assert(section.links.house.startsWith("https://uscode.house.gov/"), "house host");
  }
  console.log(`${actId}: ${file.sections.length} sections`);
}

const act33 = load("src/data/statutes/33-act.json");
const section5 = act33.sections.find((section) => section.actSection === "5");
assert(section5.outline.map((node) => node.anchor).join(",") === "a,b,c,d,e", "§ 5 outline anchors");
const section2 = act33.sections.find((section) => section.actSection === "2");
const terms = [];
const walk = (nodes) => {
  for (const node of nodes || []) {
    if (node.terms) terms.push(...node.terms);
    walk(node.children);
  }
};
walk(section2.outline);
assert(terms.includes("underwriter") && terms.includes("accredited investor"), "§ 2 defined terms");

const related = load("src/data/statutes/34-act.json").sections.find((section) => section.uscSlug === "78d-6");
assert(related && !related.actSection, "78d-6 is not an Exchange Act section");
const schedule = act33.sections.find((section) => section.slug === "schedule-a");
assert(schedule?.uscSlug === "77aa", "Schedule A is 77aa");

const provenance = load("src/data/statutes/provenance.json");
assert(provenance.zipSha256?.length === 64, "sha256");
assert(provenance.source.includes("uscode.house.gov"), "official source url");
assert(provenance.release.docPublicationName.includes("119-124"), "release point");

if (existsSync(path.join(ROOT, "src/data/edgar/companies.json"))) {
  const edgar = load("src/data/edgar/companies.json");
  const issuers = load("public/data/issuers.json");
  for (const ticker of ["AAPL", "MSFT", "JPM"]) {
    const row = issuers.find((item) => item[0] === ticker);
    assert(row, `issuer ${ticker}`);
    const company = edgar.companies[String(row?.[2])];
    assert(company, `company ${ticker}`);
    const forms = (company?.filings || []).map((filing) => (Array.isArray(filing) ? filing[0] : filing.form));
    assert(forms.some((form) => form === "10-K" || form === "20-F"), `${ticker} annual report`);
    assert(company?.tickers.some((item) => item.slug === ticker.toLowerCase()), `${ticker} slug`);
  }
  console.log(`edgar: ${edgar.companyCount} companies, ${edgar.withFilings} with filings`);
} else {
  assert(false, "EDGAR snapshot missing");
}

const rules = load("src/data/rules/manifest.json");
assert(/^\d{4}-\d{2}-\d{2}$/.test(rules.date), `rules date ${rules.date}`);
const rule10b5 = load("src/data/rules/240.json").sections.find((section) => section.slug === "rule-10b-5");
assert(rule10b5?.html?.includes('id="a"') && rule10b5.html.includes('id="b"') && rule10b5.html.includes('id="c"'), "10b-5 anchors");
assert(rule10b5?.html?.includes("purchase or sale"), "10b-5 trailing clause");
assert(rule10b5?.links?.ecfr.includes("240.10b-5") && rule10b5.links.govinfo.includes("sectionnum=10b-5"), "10b-5 official links");
const rule144 = load("src/data/rules/230.json").sections.find((section) => section.slug === "rule-144");
assert(rule144?.anchors.includes("a-1"), "rule 144 paragraph (a)(1)");
const item402 = load("src/data/rules/229.json").sections.find((section) => section.slug === "item-402");
assert(item402?.chunks?.some((chunk) => chunk.anchor === "a") && item402.chunks.some((chunk) => chunk.anchor === "w"), "item 402 split through (w)");
const statuteLinks = load("src/data/rules/statute-links.json");
assert(statuteLinks["34-act/section-10"]?.rules?.[0]?.path === "rules/17-cfr-240/rule-10b-5/", "§ 10 leads with Rule 10b-5");
assert(statuteLinks["33-act/section-5"]?.rules?.some((item) => item.path === "rules/17-cfr-230/rule-144/"), "§ 5 links Rule 144");
assert(statuteLinks["34-act/section-13"]?.forms?.some((item) => item.path === "forms/10-k/"), "§ 13 links Form 10-K");
assert(statuteLinks["34-act/section-16"]?.forms?.some((item) => item.path === "forms/3/"), "§ 16 links Form 3");
console.log(`rules: ${rules.parts.map((part) => `${part.part}=${part.sections}`).join(" ")}`);

const dist = path.join(ROOT, "dist");
if (existsSync(dist)) {
  const home = readFileSync(path.join(dist, "index.html"), "utf8");
  assert(home.includes('href="/sld/'), "home links use /sld/");
  assert(!home.includes('href="/33-act/'), "home does not link to site root");
  assert(home.includes("/sld/33-act/section-5/"), "home pins section 5");
  const section = readFileSync(path.join(dist, "33-act/section-5/index.html"), "utf8");
  assert(section.includes("15 U.S.C. § 77e"), "section 5 cite");
  assert(section.includes("uscode.house.gov"), "section 5 official link");
  assert(section.includes('id="b"') || section.includes('href="#b"'), "section 5 subsection anchor");
  assert(section.includes("registration statement"), "section 5 operative text");
  assert(section.includes("<details"), "section 5 notes are collapsed");
  const section10 = readFileSync(path.join(dist, "34-act/section-10/index.html"), "utf8");
  assert(section10.includes('id="b"'), "Exchange Act § 10(b) anchor");
  assert(section10.includes("purchase or sale"), "Exchange Act § 10(b) text");
  assert(section10.includes('href="/sld/33-act/section-17/#a"'), "section 10 cross-reference stays under /sld/");
  assert(existsSync(path.join(dist, "pagefind/pagefind.js")), "pagefind bundle");
  assert(existsSync(path.join(dist, "edgar/aapl/index.html")), "AAPL page");
  assert(existsSync(path.join(dist, "34-act/section-10/index.html")), "Exchange Act § 10");
  assert(section10.includes("Implementing rules and forms"), "§ 10 implementing heading");
  assert(section10.includes("/sld/rules/17-cfr-240/rule-10b-5/"), "§ 10 links Rule 10b-5");
  assert(!home.includes("C&amp;DI") && !home.includes("C&DI"), "home says CFIs, not C&DIs");
  assert(home.includes("/sld/rules/") && home.includes("/sld/forms/"), "home links rules and forms");
  const rulePage = readFileSync(path.join(dist, "rules/17-cfr-240/rule-10b-5/index.html"), "utf8");
  assert(rulePage.includes('id="b"') && rulePage.includes("purchase or sale"), "built Rule 10b-5");
  assert(rulePage.includes("ecfr.gov") && rulePage.includes("govinfo.gov"), "built Rule 10b-5 official links");
  const rule144page = readFileSync(path.join(dist, "rules/17-cfr-230/rule-144/index.html"), "utf8");
  assert(rule144page.includes('id="a-1"') || rule144page.includes('href="#a-1"'), "built Rule 144 (a)(1)");
  const item402page = readFileSync(path.join(dist, "rules/17-cfr-229/item-402/index.html"), "utf8");
  assert(item402page.includes("/sld/rules/17-cfr-229/item-402/a/"), "built Item 402 paragraph links");
  const form8k = readFileSync(path.join(dist, "forms/8-k/index.html"), "utf8");
  assert(form8k.includes(">1.05<") && form8k.includes("Material Cybersecurity Incidents"), "Form 8-K items");
  assert(form8k.includes("sec.gov/files/form8-k.pdf"), "Form 8-K PDF");
  const formS8 = readFileSync(path.join(dist, "forms/s-8/index.html"), "utf8");
  assert(formS8.includes("How this position developed"), "Form S-8 note");
  assert(formS8.includes("126.47") && formS8.includes("33-7646") && formS8.includes("cftelinterps_securitiesactforms.pdf"), "Form S-8 primary sources");
  assert(formS8.includes("/sld/rules/17-cfr-230/rule-457/#h"), "Form S-8 links Rule 457(h)");
  const aapl = readFileSync(path.join(dist, "edgar/aapl/index.html"), "utf8");
  assert(aapl.includes("10-K"), "AAPL lists a 10-K");
  assert(aapl.includes("sec.gov/Archives/edgar/data/"), "AAPL document link");
  const weight = (file) => statSync(path.join(dist, file)).size;
  console.log(
    `weights: home ${weight("index.html")}B, §5 ${weight("33-act/section-5/index.html")}B, AAPL ${weight("edgar/aapl/index.html")}B`,
  );
  const css = readdirSync(path.join(dist, "_astro")).filter((name) => name.endsWith(".css"));
  if (css[0]) console.log(`css ${statSync(path.join(dist, "_astro", css[0])).size}B`);
} else {
  console.log("dist/ not built yet; skipping HTML checks");
}

if (links) {
  const sample = [
    "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title15-section77e&num=0&edition=prelim",
    "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title15-section77d-1&num=0&edition=prelim",
    "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title15-section78j&num=0&edition=prelim",
    "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title15-section78o-10&num=0&edition=prelim",
    "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title15-section78jj&num=0&edition=prelim",
    "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title15-section77aaa&num=0&edition=prelim",
    "https://www.govinfo.gov/link/uscode/15/77e",
    "https://www.govinfo.gov/link/uscode/15/78j",
    "https://www.law.cornell.edu/uscode/text/15/77e",
    "https://www.law.cornell.edu/uscode/text/15/78o-6",
  ];
  for (const url of sample) {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": SEC_USER_AGENT },
      signal: AbortSignal.timeout(30000),
    });
    assert(response.ok, `${response.status} ${url}`);
    console.log(`${response.status} ${url}`);
  }
}

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log("verify ok");
