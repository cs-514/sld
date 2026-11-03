/** Public-company desk: two acts, and where each CFR part lives. */

export type HalfId = "securities-act" | "exchange-act";

export const HALVES: {
  id: HalfId;
  label: string;
  statuteId: "33-act" | "34-act";
  blurb: string;
}[] = [
  {
    id: "securities-act",
    label: "Securities Act",
    statuteId: "33-act",
    blurb: "Offerings. How a security gets registered or exempted, how it can be resold, what you can say, and who is liable.",
  },
  {
    id: "exchange-act",
    label: "Exchange Act",
    statuteId: "34-act",
    blurb: "Public companies. Reporting, proxies, insiders, ownership, disclosure, governance, and deals. Foreign private issuers are included.",
  },
];

const SECURITIES_PARTS = new Set(["227", "230", "239"]);

export function halfById(id: HalfId) {
  return HALVES.find((half) => half.id === id)!;
}

export function halfForPart(part: string): HalfId {
  return SECURITIES_PARTS.has(part) ? "securities-act" : "exchange-act";
}

export function halfForStatute(actId: string): HalfId {
  return actId === "34-act" ? "exchange-act" : "securities-act";
}

/** Old site paths (33-act, 34-act, rules/17-cfr-…) become the canonical path. */
export function rewritePath(path: string): string {
  const cleaned = String(path || "").replace(/^\/+/, "");
  if (cleaned.startsWith("33-act/")) return `securities-act/${cleaned.slice("33-act/".length)}`;
  if (cleaned.startsWith("34-act/")) return `exchange-act/${cleaned.slice("34-act/".length)}`;
  const rule = /^rules\/17-cfr-(\d+)\/(.*)$/.exec(cleaned);
  if (rule) return `${halfForPart(rule[1])}/rules/17-cfr-${rule[1]}/${rule[2]}`;
  return cleaned;
}

export function rewriteHtml(html: string): string {
  if (!html) return "";
  let out = html.replaceAll('href="/33-act/', 'href="/securities-act/');
  out = out.replaceAll('href="/34-act/', 'href="/exchange-act/');
  out = out.replace(/href="\/rules\/17-cfr-(\d+)\//g, (_match, part: string) => {
    return `href="/${halfForPart(part)}/rules/17-cfr-${part}/`;
  });
  return out;
}

export function ecfrPart(part: string): string {
  return `https://www.ecfr.gov/current/title-17/chapter-II/part-${part}`;
}

export function ecfrSection(id: string): string {
  const part = id.split(".")[0];
  return `https://www.ecfr.gov/current/title-17/chapter-II/part-${part}/section-${id}`;
}
