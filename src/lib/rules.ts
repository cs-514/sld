import { readFileSync } from "node:fs";
import path from "node:path";
import { rewriteHtml, rewritePath } from "./desk";

export interface RuleLink {
  path: string;
  label: string;
}

export interface RuleChunk {
  anchor: string;
  label: string;
  heading: string;
  anchors: string[];
  path: string;
  slug: string;
}

export interface RulePage {
  id: string;
  part: string;
  slug: string;
  label: string;
  heading: string;
  cite: string;
  path: string;
  reserved: boolean;
  html: string;
  notesHtml: string;
  anchors: string[];
  links: { ecfr: string; govinfo: string; lii: string };
  subpart: { id: string; heading: string } | null;
  group: { id: string; heading: string } | null;
  parent: RuleLink | null;
  chunks: RuleChunk[];
}

export interface RuleGroup {
  id: string;
  identifier?: string;
  heading: string;
  sections: string[];
}

export interface RulePartFile {
  part: string;
  name: string;
  blurb: string;
  heading: string;
  path: string;
  date: string;
  source: string;
  groups: RuleGroup[];
  sections: RulePage[];
}

export interface RuleManifestPart {
  part: string;
  name: string;
  blurb: string;
  path: string;
  sections: number;
}

export interface RuleManifest {
  date: string;
  source: string;
  parts: RuleManifestPart[];
}

export interface TocBucket {
  id: string;
  heading: string;
  sections: RulePage[];
}

function readJson<T>(relative: string): T {
  const file = path.join(process.cwd(), "src/data/rules", relative);
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

const cache = new Map<string, RulePartFile>();
let manifestCache: RuleManifest | null = null;

export function loadManifest(): RuleManifest {
  if (!manifestCache) manifestCache = readJson<RuleManifest>("manifest.json");
  return manifestCache;
}

function canon(file: RulePartFile): RulePartFile {
  file.path = rewritePath(file.path);
  for (const page of file.sections) {
    page.path = rewritePath(page.path);
    page.html = rewriteHtml(page.html || "");
    page.notesHtml = rewriteHtml(page.notesHtml || "");
    if (page.parent) page.parent = { ...page.parent, path: rewritePath(page.parent.path) };
    page.chunks = (page.chunks || []).map((chunk) => ({ ...chunk, path: rewritePath(chunk.path) }));
  }
  return file;
}

export function loadPart(part: string): RulePartFile {
  if (!cache.has(part)) cache.set(part, canon(readJson<RulePartFile>(`${part}.json`)));
  return cache.get(part)!;
}

export function loadParts(): RulePartFile[] {
  return loadManifest().parts.map((part) => loadPart(part.part));
}

export function partNumber(param: string): string {
  const match = /^17-cfr-(\d+)$/.exec(param);
  const known = new Set(loadManifest().parts.map((part) => part.part));
  if (!match || !known.has(match[1])) throw new Error(`Unknown CFR part ${param}`);
  return match[1];
}

export function parents(file: RulePartFile): RulePage[] {
  return file.sections.filter((section) => !section.parent);
}

export function findRule(partParam: string, slug: string): { file: RulePartFile; page: RulePage } | undefined {
  const file = loadPart(partNumber(partParam));
  const page = file.sections.find((section) => section.slug === slug);
  if (!page) return undefined;
  return { file, page };
}

export function rulePaths(): { part: string; slug: string }[] {
  const paths: { part: string; slug: string }[] = [];
  for (const part of loadManifest().parts) {
    for (const page of loadPart(part.part).sections) {
      paths.push({ part: `17-cfr-${part.part}`, slug: page.slug });
    }
  }
  return paths;
}

let ruleById: Map<string, RulePage> | null = null;

function rulesById(): Map<string, RulePage> {
  if (!ruleById) {
    ruleById = new Map();
    for (const part of loadManifest().parts) {
      for (const page of loadPart(part.part).sections) {
        if (!page.parent) ruleById.set(page.id, page);
      }
    }
  }
  return ruleById;
}

/** Canonical path for a rule, including a paragraph anchor or split-page path when it exists. */
export function ruleTarget(id: string, anchor?: string): { path: string; label: string } | null {
  const page = rulesById().get(id);
  if (!page) return null;
  if (!anchor) return { path: page.path, label: page.label };
  const chunk = page.chunks.find(
    (item) => item.anchor === anchor || item.anchors?.includes(anchor) || anchor.startsWith(`${item.anchor}-`),
  );
  if (chunk) {
    const hash = chunk.anchor === anchor ? "" : `#${anchor}`;
    return { path: `${chunk.path}${hash}`, label: `${page.label} (${anchor})` };
  }
  if (page.anchors?.includes(anchor)) return { path: `${page.path}#${anchor}`, label: `${page.label} (${anchor})` };
  return { path: page.path, label: page.label };
}

export function neighbors(file: RulePartFile, page: RulePage): { prev: RuleLink | null; next: RuleLink | null } {
  if (page.parent) {
    const parent = parents(file).find((section) => section.path === page.parent?.path);
    const chunks = parent?.chunks || [];
    const index = chunks.findIndex((chunk) => chunk.slug === page.slug);
    const prev =
      index > 0
        ? { path: chunks[index - 1].path, label: `${parent!.label} ${chunks[index - 1].label}` }
        : parent
          ? { path: parent.path, label: parent.label }
          : null;
    const next =
      index >= 0 && index < chunks.length - 1
        ? { path: chunks[index + 1].path, label: `${parent!.label} ${chunks[index + 1].label}` }
        : null;
    return { prev, next };
  }
  const list = parents(file);
  const index = list.findIndex((section) => section.slug === page.slug);
  return {
    prev: index > 0 ? { path: list[index - 1].path, label: list[index - 1].label } : null,
    next: index >= 0 && index < list.length - 1 ? { path: list[index + 1].path, label: list[index + 1].label } : null,
  };
}

export function toc(file: RulePartFile): TocBucket[] {
  const list = parents(file);
  const byId = new Map(list.map((section) => [section.id, section]));
  const grouped = file.groups.some((group) => group.id !== "general" && group.sections.length > 0);
  if (grouped) {
    return file.groups
      .filter((group) => group.sections.length > 0)
      .map((group) => ({
        id: group.id,
        heading: group.heading,
        sections: group.sections.map((id) => byId.get(id)).filter((section): section is RulePage => Boolean(section)),
      }))
      .filter((bucket) => bucket.sections.length > 0);
  }
  const buckets: TocBucket[] = [];
  const index = new Map<string, TocBucket>();
  for (const section of list) {
    const key = section.subpart?.id || "general";
    let bucket = index.get(key);
    if (!bucket) {
      bucket = { id: key, heading: section.subpart?.heading || "General", sections: [] };
      index.set(key, bucket);
      buckets.push(bucket);
    }
    bucket.sections.push(section);
  }
  return buckets;
}

export function longDate(iso: string): string {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return iso;
  return `${months[month - 1]} ${day}, ${year}`;
}
