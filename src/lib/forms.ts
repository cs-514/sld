/** Form families used by the EDGAR snapshot and the company-page filters. */

export const FORM_QUERIES: Record<string, string> = {
  all: "",
  "10-K": "10-K,10-K/A,10-KT,20-F,20-F/A,40-F,40-F/A",
  "10-Q": "10-Q,10-Q/A,10-QT",
  "8-K": "8-K,8-K/A,6-K,6-K/A",
  "S-1": "S-1,S-1/A",
  "S-3": "S-3,S-3/A,S-3ASR",
  proxy: "DEF 14A,DEFA14A,DEFR14A,DEFM14A,PRE 14A,PREM14A",
  "13dg": "SC 13D,SC 13D/A,SC 13G,SC 13G/A",
  s16: "3,3/A,4,4/A,5,5/A",
  reg: "S-4,S-4/A,S-8,F-1,F-1/A,F-3,F-3/A,424B1,424B2,424B3,424B4,424B5,424B7,FWP",
  other: "",
};

export const CHIP_LABELS: Record<string, string> = {
  all: "All",
  "10-K": "10-K",
  "10-Q": "10-Q",
  "8-K": "8-K",
  "S-1": "S-1",
  "S-3": "S-3",
  proxy: "Proxy",
  "13dg": "13D/G",
  s16: "§16",
  reg: "Reg.",
  other: "Other",
};

export const CHIP_TITLES: Record<string, string> = {
  all: "Every filing kept in the snapshot",
  "10-K": "10-K, 20-F, 40-F, and amendments",
  "10-Q": "10-Q and amendments",
  "8-K": "8-K and 6-K",
  "S-1": "S-1 and amendments",
  "S-3": "S-3, S-3/A, and S-3ASR",
  proxy: "DEF 14A and the other proxy forms",
  "13dg": "Schedules 13D and 13G",
  s16: "Forms 3, 4, and 5",
  reg: "S-4, S-8, F-1, F-3, 424B, free writing prospectuses",
  other: "Everything else kept in the snapshot",
};

export function formGroup(form: string): string {
  const value = String(form || "").toUpperCase();
  if (/^(10-K|10-KT|20-F|40-F|NT 10-K|NT 20-F)/.test(value)) return "10-K";
  if (/^(10-Q|10-QT|NT 10-Q)/.test(value)) return "10-Q";
  if (/^(8-K|6-K)/.test(value)) return "8-K";
  if (/^S-1/.test(value)) return "S-1";
  if (/^S-3/.test(value)) return "S-3";
  if (/^(DEF 14A|DEFA14A|DEFR14A|DEFM14A|DEFC14A|PRE 14A|PREC14A|PREM14A|PRER14A|DFAN14A)/.test(value))
    return "proxy";
  if (/^(SC 13[DG]|SCHEDULE 13[DG])/.test(value)) return "13dg";
  if (/^[345](\/A)?$/.test(value)) return "s16";
  if (/^(S-4|S-8|S-11|F-1|F-3|F-4|F-10|424B|POS AM|8-A|EFFECT|FWP)/.test(value)) return "reg";
  return "other";
}

export const CHIP_ORDER = [
  "all",
  "10-K",
  "10-Q",
  "8-K",
  "S-1",
  "S-3",
  "proxy",
  "13dg",
  "s16",
  "reg",
  "other",
] as const;

export function edgarSearchUrl(cikPadded: string, group: string, start = "", end = ""): string {
  const params = new URLSearchParams();
  params.set("category", "custom");
  params.set("ciks", cikPadded);
  const forms = FORM_QUERIES[group] || "";
  if (forms) params.set("forms", forms);
  if (start || end) {
    params.set("dateRange", "custom");
    if (start) params.set("startdt", start);
    if (end) params.set("enddt", end);
  } else {
    params.set("dateRange", "all");
  }
  return `https://www.sec.gov/edgar/search/#/${params.toString()}`;
}

export function filingUrls(cik: number, accession: string, document: string): { document: string; index: string } {
  const base = `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, "")}`;
  const doc = document
    ? `${base}/${document
        .split("/")
        .map((part) => encodeURIComponent(part))
        .join("/")}`
    : "";
  return {
    document: doc,
    index: `${base}/${accession}-index.html`,
  };
}

export function entityUrl(cik: number): string {
  return `https://www.sec.gov/edgar/browse/?CIK=${cik}&owner=exclude`;
}

export function classicUrl(cikPadded: string): string {
  const params = new URLSearchParams({
    action: "getcompany",
    CIK: cikPadded,
    owner: "exclude",
    count: "40",
  });
  return `https://www.sec.gov/cgi-bin/browse-edgar?${params.toString()}`;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function fiscalYearEnd(raw: string): string {
  if (!/^\d{4}$/.test(raw || "")) return "";
  const month = Number(raw.slice(0, 2));
  const day = Number(raw.slice(2));
  if (month < 1 || month > 12 || day < 1 || day > 31) return raw;
  return `${MONTHS[month - 1]} ${day}`;
}

export function showDescription(form: string, description: string): string {
  const desc = (description || "").trim();
  if (!desc) return "";
  const upper = desc.toUpperCase();
  if (upper === form.toUpperCase() || upper === `FORM ${form.toUpperCase()}`) return "";
  return desc;
}
