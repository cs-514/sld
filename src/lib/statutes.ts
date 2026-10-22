import { readFileSync } from "node:fs";
import path from "node:path";

export interface OutlineNode {
  num: string;
  anchor: string;
  heading?: string;
  terms?: string[];
  children?: OutlineNode[];
}

export interface PublicLaw {
  pubLaw: string;
  popularName?: string;
}

export interface AddedBy {
  pubLaw?: string;
  popularName?: string;
  raw?: string;
}

export interface SectionLink {
  path: string;
  label: string;
}

export interface Section {
  usc: string;
  uscSlug: string;
  uscCite: string;
  heading: string;
  status: string;
  identifier: string;
  order: number;
  sourceCredit: string;
  publicLaws: PublicLaw[];
  addedBy: AddedBy | null;
  outline: OutlineNode[];
  links: { house: string; govinfo: string; lii: string };
  crossLinks: {
    rules: unknown[];
    forms: unknown[];
    releases: unknown[];
    interpretations: unknown[];
    amendingActs: unknown[];
  };
  subchapter?: { id: string; heading: string; num: string };
  actId: string | null;
  actTitle: string | null;
  actSection: string | null;
  schedule: string[] | null;
  origin: string | null;
  slug: string;
  label: string;
  homeAct: string;
  chapter: string;
  path: string;
  prev: SectionLink | null;
  next: SectionLink | null;
}

export interface ActFile {
  act: {
    id: string;
    shortName: string;
    titleName: string;
    path: string;
    chapter: string;
    sessionCite: string;
    enacted: string;
    scope: string;
  };
  provenance: Provenance;
  sections: Section[];
}

export interface Provenance {
  generatedAt: string;
  source: string;
  zipSha256: string;
  release: {
    docPublicationName: string;
    created: string;
    currencyNote: string;
    positiveLaw: string;
  };
  downloadPage: string;
  method: string;
  counts: Record<string, number>;
}

const ACTS = ["33-act", "34-act", "tia"] as const;
export type ActId = (typeof ACTS)[number];

function readJson<T>(relative: string): T {
  const file = path.join(process.cwd(), "src/data/statutes", relative);
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

const cache = new Map<string, ActFile>();

export function loadAct(id: string): ActFile {
  if (!cache.has(id)) {
    cache.set(id, readJson<ActFile>(`${id}.json`));
  }
  return cache.get(id)!;
}

export function loadActs(): ActFile[] {
  return ACTS.map((id) => loadAct(id));
}

export function loadProvenance(): Provenance {
  return readJson<Provenance>("provenance.json");
}

export function findSection(actId: string, slug: string): Section | undefined {
  return loadAct(actId).sections.find((section) => section.slug === slug);
}

function sortKey(section: Section): [number, string, number] {
  const raw = section.actSection || "";
  const match = /^(\d+)([A-Z]*)$/.exec(raw);
  if (!match) return [9999, raw, section.order];
  return [Number(match[1]), match[2], section.order];
}

export function byActNumber(sections: Section[]): Section[] {
  return [...sections].sort((a, b) => {
    const ka = sortKey(a);
    const kb = sortKey(b);
    if (ka[0] !== kb[0]) return ka[0] - kb[0];
    if (ka[1] !== kb[1]) return ka[1] < kb[1] ? -1 : 1;
    return ka[2] - kb[2];
  });
}

export function groupSections(sections: Section[]): {
  titleI: Section[];
  titleII: Section[];
  schedules: Section[];
  related: Section[];
} {
  const titleI: Section[] = [];
  const titleII: Section[] = [];
  const schedules: Section[] = [];
  const related: Section[] = [];
  for (const section of sections) {
    if (section.schedule?.length) schedules.push(section);
    else if (!section.actSection) related.push(section);
    else if (section.actTitle === "II") titleII.push(section);
    else titleI.push(section);
  }
  return {
    titleI: byActNumber(titleI),
    titleII: byActNumber(titleII),
    schedules,
    related: [...related].sort((a, b) => a.order - b.order),
  };
}

export function byCodeOrder(sections: Section[]): Section[] {
  return [...sections].sort((a, b) => a.order - b.order);
}

function walkTerms(nodes: OutlineNode[], into: string[]): void {
  for (const node of nodes) {
    if (node.terms) into.push(...node.terms);
    if (node.children) walkTerms(node.children, into);
  }
}

export function filterText(section: Section): string {
  const terms: string[] = [];
  walkTerms(section.outline, terms);
  const aliases = section.actSection
    ? section.outline.map((node) => `${section.actSection}${node.num}`)
    : [];
  const laws = section.publicLaws.flatMap((law) => [law.pubLaw, law.popularName || ""]);
  return [
    section.label,
    section.actSection || "",
    section.uscCite,
    section.usc,
    section.heading,
    section.status,
    ...aliases,
    ...terms,
    ...laws,
  ]
    .join(" ")
    .toLowerCase();
}

export function addedLabel(section: Section): string | null {
  const added = section.addedBy;
  if (!added?.pubLaw) return null;
  if (added.popularName) return `Added by the ${added.popularName} (Pub. L. ${added.pubLaw})`;
  return `Added by Pub. L. ${added.pubLaw}`;
}

export function citation(actName: string, section: Section): string {
  if (section.schedule?.length) return `${actName} ${section.label}, ${section.uscCite}`;
  if (section.actSection && section.actTitle === "II") {
    return `${actName} tit. II, § ${section.actSection}, ${section.uscCite}`;
  }
  if (section.actSection) return `${actName} § ${section.actSection}, ${section.uscCite}`;
  return section.uscCite;
}

export const PINS: { act: ActId; slug: string; hash?: string; note: string }[] = [
  { act: "33-act", slug: "section-5", note: "Registration and the prospectus" },
  { act: "33-act", slug: "section-4", note: "Exempted transactions" },
  { act: "33-act", slug: "section-4a", note: "Crowdfunding" },
  { act: "33-act", slug: "section-11", note: "False registration statement" },
  { act: "33-act", slug: "section-12", note: "Prospectus and seller liability" },
  { act: "33-act", slug: "section-17", note: "Fraud in the offer or sale" },
  { act: "34-act", slug: "section-10", hash: "b", note: "§ 10(b) is the subsection" },
  { act: "34-act", slug: "section-10a", note: "Audits" },
  { act: "34-act", slug: "section-12", note: "Registration of a class" },
  { act: "34-act", slug: "section-13", note: "Periodic reports" },
  { act: "34-act", slug: "section-14", note: "Proxy" },
  { act: "34-act", slug: "section-16", note: "Directors, officers, and 10% holders" },
];
