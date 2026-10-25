/** Topic link-outs. Every URL here was fetched and returned a real page. */

export interface ReadingLink {
  href: string;
  label: string;
  source: string;
}

const UC = "https://www.law.uc.edu/academics-career/library/security-lawyer-s-deskbook";

const DESK: ReadingLink = {
  href: `${UC}.html`,
  label: "Securities Lawyer's Deskbook",
  source: "University of Cincinnati",
};
const UC_10B: ReadingLink = {
  href: `${UC}/the-securities-exchange-act-of-1934/general-rules-and-regulations/manipulative-and-deceptive-devices-and-contrivances.html`,
  label: "Rules 10b-5 and 10b5-1",
  source: "University of Cincinnati",
};
const UC_100: ReadingLink = {
  href: `${UC}/the-securities-act-of-1933/general-rules-and-regulations--securities-act-of-1933/securities-act-of-1933--rule-100-to-rule-215.html`,
  label: "Securities Act Rules 100–215, including Rule 144",
  source: "University of Cincinnati",
};
const UC_SK: ReadingLink = {
  href: `${UC}/regulation-s-k.html`,
  label: "Regulation S-K",
  source: "University of Cincinnati",
};
const UC_SX: ReadingLink = {
  href: `${UC}/regulation-s-x--17-cfr-part-210-.html`,
  label: "Regulation S-X",
  source: "University of Cincinnati",
};
const UC_D: ReadingLink = {
  href: `${UC}/the-securities-act-of-1933/general-rules-and-regulations--securities-act-of-1933/regulation-d.html`,
  label: "Regulation D",
  source: "University of Cincinnati",
};
const UC_S: ReadingLink = {
  href: `${UC}/the-securities-act-of-1933/general-rules-and-regulations--securities-act-of-1933/regulation-s.html`,
  label: "Regulation S",
  source: "University of Cincinnati",
};
const UC_14A: ReadingLink = {
  href: `${UC}/the-securities-exchange-act-of-1934/general-rules-and-regulations/regulation-14a.html`,
  label: "Regulation 14A",
  source: "University of Cincinnati",
};
const UC_13A: ReadingLink = {
  href: `${UC}/the-securities-exchange-act-of-1934/general-rules-and-regulations/regulation-13a.html`,
  label: "Regulation 13A",
  source: "University of Cincinnati",
};
const UC_15D: ReadingLink = {
  href: `${UC}/the-securities-exchange-act-of-1934/general-rules-and-regulations/regulation-15d.html`,
  label: "Regulation 15D",
  source: "University of Cincinnati",
};
const WOW: ReadingLink = {
  href: "https://www.wowlw.com/",
  label: "Words of Wisdom",
  source: "Latham & Watkins",
};
const WOW_16: ReadingLink = {
  href: "https://www.wowlw.com/Article/Index/143",
  label: "A primer on Section 16 officers",
  source: "Latham & Watkins",
};
const TCC_144: ReadingLink = {
  href: "https://www.thecorporatecounsel.net/blog/2024/01/rule-144-handy-flow-chart.html",
  label: "Rule 144: a flow chart",
  source: "TheCorporateCounsel.net",
};

function unique(links: ReadingLink[]): ReadingLink[] {
  const seen = new Set<string>();
  return links.filter((link) => {
    if (seen.has(link.href)) return false;
    seen.add(link.href);
    return true;
  });
}

export function readingForIndex(): ReadingLink[] {
  return [DESK, WOW];
}

export function readingForPart(part: string): ReadingLink[] {
  if (part === "229") return [UC_SK, DESK];
  if (part === "210") return [UC_SX, DESK];
  if (part === "230") return [DESK, WOW];
  if (part === "240") return [DESK, WOW];
  return [DESK];
}

export function readingForRule(id: string): ReadingLink[] {
  const links: ReadingLink[] = [];
  if (id === "240.10b-5" || id === "240.10b5-1") links.push(UC_10B);
  if (id === "230.144" || id === "230.144A") links.push(UC_100, TCC_144);
  if (/^230\.50[0-8]$/.test(id)) links.push(UC_D);
  if (/^230\.90[1-5]$/.test(id)) links.push(UC_S);
  if (id.startsWith("240.14a")) links.push(UC_14A);
  if (id.startsWith("240.13a")) links.push(UC_13A);
  if (id.startsWith("240.15d")) links.push(UC_15D);
  if (/^240\.16[abc]/.test(id)) links.push(WOW_16);
  if (["229.303", "229.401", "229.402", "229.404", "229.601", "229.701"].includes(id)) links.push(UC_SK);
  if (id === "210.3-05" || id === "210.3-14" || id === "210.8-04" || id === "210.11-01") links.push(UC_SX);
  return unique(links);
}

export function readingForForm(slug: string): ReadingLink[] {
  const links: ReadingLink[] = [];
  if (slug === "144") links.push(UC_100, TCC_144);
  if (slug === "d") links.push(UC_D);
  if (["10-k", "10-q", "8-k", "20-f", "6-k", "40-f", "11-k"].includes(slug)) links.push(UC_13A);
  if (["10-k", "10-q", "8-k"].includes(slug)) links.push(UC_15D);
  if (slug === "def-14a") links.push(UC_14A);
  if (slug === "3" || slug === "4" || slug === "5") links.push(WOW_16);
  if (slug === "s-1" || slug === "s-3" || slug === "s-4" || slug === "s-8") links.push(UC_SK);
  return unique(links);
}
