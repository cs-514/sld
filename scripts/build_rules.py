#!/usr/bin/env python3
"""Download 17 C.F.R. Parts 210, 229, 230, 239, 240, and 249 from the eCFR
versioner API and write the rule pages the site renders.

The text is a United States government work. Paragraph anchors follow the
markers in the text (#a, #a-1, #b-2-i). Very large Regulation S-K and S-X
items, and any other section over 140 KB, are split at the top-level marker
so a phone does not load the whole item at once.

Usage:
  python3 scripts/build_rules.py            # use data/cache/ecfr if present
  python3 scripts/build_rules.py --download # refresh from eCFR first
"""

from __future__ import annotations

import argparse
import json
import os
import re
import urllib.request
from collections import defaultdict
from pathlib import Path

from lxml import etree

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "data" / "cache" / "ecfr"
OUT = ROOT / "src" / "data" / "rules"
STATUTES = ROOT / "src" / "data" / "statutes"

PARTS = ("210", "229", "230", "239", "240", "249")
PART_META = {
    "210": {
        "name": "Regulation S-X",
        "blurb": "Form and content of financial statements. Article rules are cited as Rule 1-01, Rule 3-05, and so on.",
        "style": "sx",
    },
    "229": {
        "name": "Regulation S-K",
        "blurb": "Non-financial disclosure. Sections are Items (Item 101, Item 303, Item 402).",
        "style": "item",
    },
    "230": {
        "name": "Securities Act rules",
        "blurb": "General rules under the Securities Act of 1933, including Regulation D, Rule 144, Regulation S, and the registration-statement rules.",
        "style": "rule",
    },
    "239": {
        "name": "Securities Act forms",
        "blurb": "Forms prescribed under the Securities Act. The form pages under Forms restate what each form is for and link here for the Code section.",
        "style": "form",
    },
    "240": {
        "name": "Exchange Act rules",
        "blurb": "General rules under the Securities Exchange Act of 1934, including Rule 10b-5, Regulation 14A, and Regulation 13D-G.",
        "style": "rule",
    },
    "249": {
        "name": "Exchange Act forms",
        "blurb": "Forms prescribed under the Exchange Act, including Forms 10-K, 10-Q, and 8-K.",
        "style": "form",
    },
}

# HTML length above which a section is split. S-K and S-X items split sooner.
SPLIT_AT = {"229": 80_000, "210": 80_000}
DEFAULT_SPLIT = 140_000

ROMAN_VALUES = {
    "i": 1, "ii": 2, "iii": 3, "iv": 4, "v": 5, "vi": 6, "vii": 7, "viii": 8, "ix": 9,
    "x": 10, "xi": 11, "xii": 12, "xiii": 13, "xiv": 14, "xv": 15, "xvi": 16,
    "xvii": 17, "xviii": 18, "xix": 19, "xx": 20,
}
MARKER_RE = re.compile(r"^\s*\(([0-9]+|[A-Za-z]{1,6})\)")

# Curated implementing relationships. Automatic cites are added on top, then capped.
CURATED = {
    ("33-act", "5"): {
        "rules": ["230.135", "230.144", "230.163", "230.415", "230.501", "230.901"],
        "rule_labels": {"230.501": "Regulation D (Rule 501)", "230.901": "Regulation S (Rule 901)"},
        "forms": ["s-1", "s-3"],
    },
    ("33-act", "4"): {
        "rules": ["230.144", "230.144A", "230.506", "230.701", "230.501", "230.901"],
        "rule_labels": {"230.501": "Regulation D (Rule 501)", "230.901": "Regulation S (Rule 901)", "230.506": "Rule 506"},
        "forms": ["d", "144", "1-a"],
    },
    ("33-act", "2"): {"rules": ["230.405"], "forms": []},
    ("33-act", "7"): {"rules": ["229.301", "210.3-01", "210.8-01"], "forms": ["s-1"]},
    ("33-act", "10"): {"rules": ["229.10", "229.501", "229.512"], "forms": ["s-1", "s-3"]},
    ("34-act", "10"): {
        "rules": ["240.10b-5", "240.10b5-1"],
        "rule_labels": {"240.10b-5": "Rule 10b-5 (§ 10(b))", "240.10b5-1": "Rule 10b5-1"},
        "forms": [],
    },
    ("34-act", "13"): {
        "rules": ["240.13a-1", "240.13a-13", "240.13d-1", "240.13d-101", "240.13d-102"],
        "forms": ["10-k", "10-q", "8-k", "schedule-13d", "schedule-13g"],
    },
    ("34-act", "14"): {
        "rules": ["240.14a-1", "240.14a-8", "240.14a-9", "240.14a-101"],
        "forms": ["def-14a"],
    },
    ("34-act", "15"): {
        "rules": ["240.15d-1", "240.15d-13"],
        "forms": ["10-k", "10-q", "8-k"],
    },
    ("34-act", "16"): {
        "rules": ["240.16a-1", "240.16a-2", "240.16a-3", "240.16b-3", "240.16c-1"],
        "forms": ["3", "4", "5"],
    },
    ("34-act", "12"): {
        "rules": ["240.12b-2", "240.12g-1", "240.12b-20"],
        "forms": ["8-a", "10-k"],
    },
}

FORM_LABELS = {
    "s-1": "Form S-1",
    "s-3": "Form S-3",
    "s-4": "Form S-4",
    "s-8": "Form S-8",
    "f-1": "Form F-1",
    "f-3": "Form F-3",
    "10-k": "Form 10-K",
    "10-q": "Form 10-Q",
    "8-k": "Form 8-K",
    "20-f": "Form 20-F",
    "6-k": "Form 6-K",
    "40-f": "Form 40-F",
    "11-k": "Form 11-K",
    "def-14a": "Schedule 14A (DEF 14A)",
    "schedule-13d": "Schedule 13D",
    "schedule-13g": "Schedule 13G",
    "3": "Form 3",
    "4": "Form 4",
    "5": "Form 5",
    "144": "Form 144",
    "d": "Form D",
    "1-a": "Form 1-A",
    "15": "Form 15",
    "25": "Form 25",
    "8-a": "Form 8-A",
}


def user_agent() -> str:
    env = os.environ.get("SEC_USER_AGENT", "").strip()
    if env:
        return env
    text = (ROOT / "scripts" / "user-agent.mjs").read_text()
    match = re.search(r'DEFAULT_UA = "([^"]+)"', text)
    if not match:
        raise SystemExit("Could not read SEC_USER_AGENT")
    return match.group(1)


def fetch(url: str, dest: Path, ua: str) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": ua, "Accept-Encoding": "gzip"})
    with urllib.request.urlopen(req, timeout=120) as response:
        raw = response.read()
    if raw[:2] == b"\x1f\x8b":
        import gzip
        raw = gzip.decompress(raw)
    dest.write_bytes(raw)


def issue_date(ua: str) -> str:
    req = urllib.request.Request(
        "https://www.ecfr.gov/api/versioner/v1/titles",
        headers={"User-Agent": ua, "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as response:
        data = json.loads(response.read().decode())
    for title in data["titles"]:
        if title["number"] == 17:
            return title["up_to_date_as_of"]
    raise SystemExit("Title 17 not in the eCFR titles list")


def esc(value: str) -> str:
    return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def inline(el) -> str:
    bits = [esc(el.text or "")]
    for child in el:
        tag = child.tag.lower() if isinstance(child.tag, str) else ""
        inner = inline(child)
        if tag in {"i", "e"}:
            bits.append(f"<em>{inner}</em>")
        elif tag == "su":
            bits.append(f"<sub>{inner}</sub>")
        elif tag == "sup":
            bits.append(f"<sup>{inner}</sup>")
        elif tag == "br":
            bits.append("<br>")
        elif tag == "ftref":
            bits.append(f"<sup>{inner}</sup>")
        elif tag == "table":
            bits.append(render_table(child))
        else:
            bits.append(inner)
        bits.append(esc(child.tail or ""))
    return "".join(bits)


def render_table(el) -> str:
    rows = []
    for child in el:
        tag = child.tag.lower() if isinstance(child.tag, str) else ""
        if tag in {"thead", "tbody", "tfoot"}:
            rows.append(render_table(child).removeprefix('<div class="tw">').removesuffix("</div>"))
        elif tag == "tr":
            cells = []
            for cell in child:
                name = "th" if (cell.tag or "").lower() == "th" else "td"
                cells.append(f"<{name}>{inline(cell)}</{name}>")
            rows.append("<tr>" + "".join(cells) + "</tr>")
        elif tag == "caption":
            rows.append(f"<caption>{inline(child)}</caption>")
    return '<div class="tw"><table>' + "".join(rows) + "</table></div>"


class Node:
    def __init__(self, parent=None):
        self.parent = parent
        self.marker = None
        self.kind = None
        self.anchor = None
        self.flow: list = []
        self.children: list[Node] = []

    def heading_text(self) -> str:
        bits = []
        for item in self.flow:
            if isinstance(item, str):
                bits.append(item)
            if len(" ".join(bits)) > 180:
                break
        text = re.sub(r"<[^>]+>", "", " ".join(bits))
        text = re.sub(r"\s+", " ", text).strip()
        return text[:140]


def classify(token: str, stack: list[Node]) -> str | None:
    if re.fullmatch(r"\d+", token):
        return "num"
    if re.fullmatch(r"[A-Z]", token):
        return "upper"
    lower = token.lower()
    if lower in ROMAN_VALUES and (len(token) > 1 or token in {"i", "v", "x"}):
        if len(token) > 1 and token == lower:
            return "roman"
        if token in {"i", "v", "x"}:
            top = stack[-1] if stack else None
            if top and top.kind == "num":
                return "roman"
            # (iv) then (v) is the roman sequence. A later (v) that does not
            # follow (iv) is the letter after (u), as in Item 402(v).
            if (
                top
                and top.kind == "roman"
                and ROMAN_VALUES.get(token, 0) == ROMAN_VALUES.get(top.marker, -1) + 1
            ):
                return "roman"
            for node in reversed(stack):
                if node.kind == "alpha" and len(node.marker) == 1 and ord(token) == ord(node.marker) + 1:
                    return "alpha"
            if top and top.kind == "roman":
                return "roman"
            if any(node.kind == "num" for node in stack):
                return "roman"
            return "alpha"
        if token == lower and lower in ROMAN_VALUES and len(token) > 1:
            return "roman"
    if re.fullmatch(r"[a-z]", token):
        return "alpha"
    if lower in ROMAN_VALUES and token == lower:
        return "roman"
    return None


def continues(prev: str, token: str, kind: str) -> bool:
    if kind == "num":
        return int(token) > int(prev)
    if kind == "alpha":
        return len(token) == 1 and len(prev) == 1 and 0 < ord(token) - ord(prev) <= 1
    if kind == "upper":
        return len(token) == 1 and len(prev) == 1 and 0 < ord(token) - ord(prev) <= 1
    if kind == "roman":
        return ROMAN_VALUES.get(token, 0) > ROMAN_VALUES.get(prev, 0)
    return False


def place(root: Node, stack: list[Node], token: str, kind: str, html: str) -> None:
    node = Node()
    node.marker = token
    node.kind = kind
    parent = root
    for index in range(len(stack) - 1, -1, -1):
        if stack[index].kind == kind and continues(stack[index].marker, token, kind):
            parent = stack[index].parent or root
            del stack[index:]
            break
    else:
        parent = stack[-1] if stack else root
    node.parent = parent
    node.flow.append(html)
    parent.flow.append(node)
    parent.children.append(node)
    stack.append(node)
    chain = []
    cursor: Node | None = node
    while cursor is not None and cursor.marker:
        chain.append(cursor.marker)
        cursor = cursor.parent
    node.anchor = "-".join(reversed(chain))


def add_plain(root: Node, stack: list[Node], html: str, flush: bool = False) -> None:
    if flush:
        root.flow.append(html)
        return
    target = stack[-1] if stack else root
    target.flow.append(html)


def render_node(node: Node, with_id: bool = True) -> str:
    body = []
    for item in node.flow:
        if isinstance(item, str):
            body.append(item)
        else:
            body.append(render_node(item, with_id))
    inner = "".join(body)
    if node.anchor and with_id:
        return f'<div class="s" id="{esc(node.anchor)}">{inner}</div>'
    return inner


def block_html(el) -> str:
    tag = el.tag.lower() if isinstance(el.tag, str) else ""
    if tag == "table":
        return render_table(el)
    if tag in {"hd1", "hd2", "hd3", "hed"}:
        return f"<h3>{inline(el)}</h3>"
    return f"<p>{inline(el)}</p>"


def consume_blocks(elements, root: Node) -> None:
    stack: list[Node] = []
    for el in elements:
        tag = el.tag.lower() if isinstance(el.tag, str) else ""
        if tag in {"cita", "secauth", "ednote", "source", "auth"}:
            continue
        if tag in {"note", "extract", "example"}:
            bits = []
            for child in el:
                child_tag = child.tag.lower() if isinstance(child.tag, str) else ""
                if child_tag in {"hed", "hd1"}:
                    bits.append(f"<h3>{inline(child)}</h3>")
                elif child_tag == "table":
                    bits.append(render_table(child))
                else:
                    bits.append(f"<p>{inline(child)}</p>")
            add_plain(root, stack, f'<div class="note">{"".join(bits)}</div>')
            continue
        if tag in {"p", "pspace", "fp", "fp-dash"}:
            text = el.text or ""
            match = MARKER_RE.match(text)
            html = f"<p>{inline(el)}</p>"
            if match:
                token = match.group(1)
                kind = classify(token, stack)
                if kind:
                    place(root, stack, token, kind, html)
                    continue
            # A flush paragraph after (a)/(b)/(c) is the trailing clause, not part of (c).
            add_plain(root, stack, html, flush=tag in {"fp", "fp-dash"})
            continue
        if tag in {"table", "hd1", "hd2", "hd3", "hed", "div"}:
            if tag == "div":
                consume_blocks(list(el), stack[-1] if stack else root)
            else:
                add_plain(root, stack, block_html(el))


def notes_html(div) -> str:
    bits = []
    for el in div:
        tag = el.tag.lower() if isinstance(el.tag, str) else ""
        if tag == "secauth":
            bits.append(f"<p>{inline(el)}</p>")
        elif tag in {"cita", "ednote"}:
            bits.append(f"<p>{inline(el)}</p>")
    if not bits:
        return ""
    return (
        '<details class="amendments" data-pagefind-ignore><summary>Authority and source note</summary>'
        + "".join(bits)
        + "</details>"
    )


def section_rest(part: str, identifier: str) -> str:
    prefix = part + "."
    if identifier.startswith(prefix):
        return identifier[len(prefix) :]
    return identifier


def slug_for(part: str, identifier: str) -> str:
    rest = section_rest(part, identifier).lower().replace(".", "-")
    if part == "229":
        return f"item-{rest}"
    if part in {"239", "249"}:
        return f"section-{rest}"
    return f"rule-{rest}"


def label_for(part: str, identifier: str, head: str) -> str:
    rest = section_rest(part, identifier)
    if part == "229":
        match = re.search(r"\(Item\s+([^)]+)\)", head)
        item = match.group(1).strip() if match else rest
        return f"Item {item}"
    if part in {"239", "249"}:
        match = re.search(r"((?:Form|Schedule)\s+[A-Z0-9][A-Z0-9-]*)", head)
        if match:
            return f"{match.group(1)} (§ {identifier})"
        if "Reserved" in head or "reserved" in head:
            return f"§ {identifier}"
        return f"§ {identifier}"
    return f"Rule {rest}"


def heading_for(head: str) -> str:
    text = re.sub(r"\s+", " ", head).strip()
    text = re.sub(r"^§+\s*[\d][\dA-Za-z.\-]*\s*", "", text)
    text = re.sub(r"^\(Item\s+[^)]+\)\s*", "", text)
    return text.rstrip(".").strip() or text


def group_slug(heading: str, identifier: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", heading.lower()).strip("-")
    slug = slug[:64].strip("-")
    if not slug:
        slug = re.sub(r"[^a-z0-9]+", "-", identifier.lower()).strip("-")[:40]
    return slug


def official_links(part: str, identifier: str) -> dict[str, str]:
    rest = section_rest(part, identifier)
    gov = f"https://www.govinfo.gov/link/cfr/17/{part}?year=mostrecent&link-type=details"
    if rest and "." not in rest:
        gov = (
            f"https://www.govinfo.gov/link/cfr/17/{part}"
            f"?sectionnum={urllib.parse.quote(rest)}&year=mostrecent&link-type=details"
        )
    return {
        "ecfr": f"https://www.ecfr.gov/current/title-17/chapter-II/part-{part}/section-{identifier}",
        "govinfo": gov,
        "lii": f"https://www.law.cornell.edu/cfr/text/17/{identifier}",
    }


import urllib.parse  # noqa: E402  (used above; imported late only to keep the header short)


def parse_part(part: str, path: Path) -> dict:
    root = etree.parse(path).getroot()
    head = re.sub(r"\s+", " ", root.findtext("HEAD") or "").strip()
    subpart = None
    group = None
    groups: list[dict] = []
    group_index: dict[str, dict] = {}
    sections: list[dict] = []

    def ensure_group(identifier: str, heading: str) -> dict:
        slug = group_slug(heading, identifier)
        base = slug
        n = 2
        while slug in group_index and group_index[slug]["identifier"] != identifier:
            slug = f"{base}-{n}"
            n += 1
        if slug not in group_index:
            record = {"id": slug, "identifier": identifier, "heading": heading, "sections": []}
            group_index[slug] = record
            groups.append(record)
        return group_index[slug]

    def walk(el, current_subpart, current_group):
        for child in el:
            tag = child.tag if isinstance(child.tag, str) else ""
            kind = child.get("TYPE")
            if tag == "DIV6" and kind == "SUBPART":
                heading = re.sub(r"\s+", " ", child.findtext("HEAD") or "").strip()
                sub = {"id": group_slug(heading, child.get("N") or "subpart"), "heading": heading}
                walk(child, sub, current_group)
            elif tag == "DIV7":
                heading = re.sub(r"\s+", " ", child.findtext("HEAD") or "").strip()
                grp = ensure_group(child.get("N") or heading, heading)
                walk(child, current_subpart, grp)
            elif tag == "DIV8" and kind == "SECTION":
                record = build_section(part, child, current_subpart, current_group)
                sections.append(record)
                if current_group is not None:
                    current_group["sections"].append(record["id"])
            elif tag in {"DIV6", "DIV7", "DIV9"}:
                walk(child, current_subpart, current_group)

    walk(root, subpart, group)
    # Sections that never entered a subject group still need a bucket.
    loose = [section["id"] for section in sections if not any(section["id"] in g["sections"] for g in groups)]
    if loose:
        groups.insert(0, {"id": "general", "identifier": "general", "heading": "General", "sections": loose})
    return {
        "part": part,
        "name": PART_META[part]["name"],
        "blurb": PART_META[part]["blurb"],
        "heading": head,
        "path": f"rules/17-cfr-{part}/",
        "groups": [{k: v for k, v in g.items() if k != "identifier"} | {"identifier": g["identifier"]} for g in groups],
        "sections": sections,
    }


def build_section(part: str, div, subpart, group) -> dict:
    identifier = div.get("N") or ""
    head = re.sub(r"\s+", " ", div.findtext("HEAD") or "").strip()
    root = Node()
    body_children = [child for child in div if child.tag != "HEAD"]
    consume_blocks(body_children, root)
    anchors = []

    def collect(node: Node) -> None:
        if node.anchor:
            anchors.append(node.anchor)
        for child in node.children:
            collect(child)

    collect(root)
    html = render_node(root, True)
    jump = ""
    if len(root.children) >= 2:
        links = []
        for child in root.children:
            if not child.anchor:
                continue
            label = f"({child.marker})"
            links.append(f'<a href="#{esc(child.anchor)}">{esc(label)}</a>')
        if links:
            jump = '<nav class="jump" aria-label="Paragraphs">' + "".join(links) + "</nav>"
    wrapped = f'<div class="statute">{jump}{html}</div>' if html else ""
    reserved = bool(re.search(r"\[Reserved\]", head, re.I)) or "reserved" in re.sub(r"<[^>]+>", "", html).lower()[:80]
    links = official_links(part, identifier)
    record = {
        "id": identifier,
        "part": part,
        "slug": slug_for(part, identifier),
        "label": label_for(part, identifier, head),
        "heading": heading_for(head),
        "cite": f"17 C.F.R. § {identifier}",
        "path": f"rules/17-cfr-{part}/{slug_for(part, identifier)}/",
        "reserved": reserved,
        "html": wrapped,
        "notesHtml": notes_html(div),
        "anchors": anchors,
        "links": links,
        "subpart": subpart,
        "group": {"id": group["id"], "heading": group["heading"]} if group else None,
        "parent": None,
        "chunks": [],
    }
    record["bytes"] = len(wrapped.encode("utf-8"))
    split_large(record, root)
    return record


def split_large(record: dict, root: Node) -> None:
    limit = SPLIT_AT.get(record["part"], DEFAULT_SPLIT)
    if record["bytes"] < limit or not root.children:
        return
    intro: list[str] = []
    trailing: list[str] = []
    chunks = []
    seen_chunk = False
    for item in root.flow:
        if isinstance(item, str):
            (trailing if seen_chunk else intro).append(item)
            continue
        if not item.anchor:
            intro.append(render_node(item, True))
            continue
        seen_chunk = True
        chunk_html = f'<div class="statute">{render_node(item, True)}</div>'
        chunks.append(
            {
                "anchor": item.anchor,
                "marker": item.marker,
                "label": f"({item.marker})",
                "heading": item.heading_text(),
                "html": chunk_html,
                "anchors": re.findall(r'id="([^"]+)"', chunk_html),
                "bytes": len(chunk_html.encode("utf-8")),
            }
        )
    if len(chunks) < 2:
        return
    items = []
    for chunk in chunks:
        href = f'/{record["path"]}{chunk["anchor"]}/'
        items.append(
            f'<li><a href="{esc(href)}">{esc(chunk["label"])}</a> '
            f'<span>{esc(chunk["heading"][:180])}</span></li>'
        )
    hub = (
        '<div class="statute">'
        + "".join(intro)
        + '<nav class="jump" aria-label="Paragraphs"><p>This section is split by paragraph so the page stays readable.</p><ul class="split">'
        + "".join(items)
        + "</ul></nav>"
        + "".join(trailing)
        + "</div>"
    )
    record["html"] = hub
    record["bytes"] = len(hub.encode("utf-8"))
    record["chunks"] = [
        {
            "anchor": chunk["anchor"],
            "label": chunk["label"],
            "heading": chunk["heading"],
            "html": chunk["html"],
            "anchors": chunk["anchors"],
            "bytes": chunk["bytes"],
            "path": f'{record["path"]}{chunk["anchor"]}/',
            "slug": f'{record["slug"]}/{chunk["anchor"]}',
        }
        for chunk in chunks
    ]
    record["anchors"] = [anchor for chunk in chunks for anchor in chunk["anchors"]]


def flatten(parts: list[dict]) -> list[dict]:
    pages = []
    for part in parts:
        for section in part["sections"]:
            pages.append(section)
            for chunk in section["chunks"]:
                pages.append(
                    {
                        "id": section["id"],
                        "part": section["part"],
                        "slug": chunk["slug"],
                        "label": f'{section["label"]} {chunk["label"]}',
                        "heading": chunk["heading"],
                        "cite": section["cite"],
                        "path": chunk["path"],
                        "reserved": False,
                        "html": chunk["html"],
                        "notesHtml": "",
                        "anchors": chunk.get("anchors") or [chunk["anchor"]],
                        "links": section["links"],
                        "subpart": section["subpart"],
                        "group": section["group"],
                        "parent": {"path": section["path"], "label": section["label"]},
                        "chunks": [],
                        "bytes": chunk["bytes"],
                    }
                )
    return pages


def load_statutes() -> dict:
    by_act = {}
    by_usc = {}
    for act in ("33-act", "34-act", "tia"):
        data = json.loads((STATUTES / f"{act}.json").read_text())
        for section in data["sections"]:
            anchors = set(re.findall(r'id="([^"]+)"', section.get("textHtml") or ""))
            info = {"path": section["path"].lstrip("/"), "label": section["label"], "anchors": anchors, "act": act}
            key = (section.get("actSection") or "").replace(" ", "")
            if key:
                by_act[(act, key.upper())] = info
            by_usc[section["usc"].lower()] = info
    return {"act": by_act, "usc": by_usc}


def act_for_part(part: str) -> str | None:
    if part in {"230", "239"}:
        return "33-act"
    if part in {"240", "249"}:
        return "34-act"
    return None


ACT_NAME = {
    "securities act": "33-act",
    "exchange act": "34-act",
    "trust indenture act": "tia",
}


def hash_for(info: dict, bits: list[str]) -> str:
    if not bits:
        return ""
    anchor = "-".join(bits)
    if anchor in info["anchors"]:
        return "#" + anchor
    # Uppercase clause letters are stored that way (b-2-A). Try that, then the bare section.
    alt = "-".join(bit if bit.isdigit() or (len(bit) == 1 and bit.islower()) else bit.upper() if len(bit) == 1 else bit for bit in bits)
    if alt in info["anchors"]:
        return "#" + alt
    if bits[0] in info["anchors"]:
        return "#" + bits[0]
    return ""


def link_pages(pages: list[dict], statutes: dict, groups_by_part: dict) -> dict:
    by_id = {}
    rule_alias = defaultdict(list)
    item_alias = {}
    for page in pages:
        if page.get("parent"):
            continue
        by_id[page["id"]] = page
        rest = section_rest(page["part"], page["id"])
        if page["part"] == "229":
            item_alias[rest.split("-")[0]] = page
        else:
            rule_alias[rest].append(page)
    # Anchor targets: full id + hash -> path
    anchor_target = {}
    for page in pages:
        if page.get("parent"):
            for anchor in page["anchors"]:
                anchor_target[(page["id"], anchor)] = page["path"] + "#" + anchor
        else:
            anchor_target[(page["id"], "")] = page["path"]
            if not page["chunks"]:
                for anchor in page["anchors"]:
                    anchor_target[(page["id"], anchor)] = page["path"] + "#" + anchor
            else:
                for chunk in page["chunks"]:
                    anchor_target[(page["id"], chunk["anchor"])] = chunk["path"]
                    for anchor in page["anchors"]:
                        if anchor == chunk["anchor"] or anchor.startswith(chunk["anchor"] + "-"):
                            anchor_target[(page["id"], anchor)] = chunk["path"] + "#" + anchor

    def rule_target(number: str, part: str) -> dict | None:
        hits = rule_alias.get(number) or rule_alias.get(number.upper()) or []
        if not hits:
            # 144 vs 144A already distinct keys
            hits = [page for page in rule_alias.get(number, [])]
        if not hits:
            return None
        same = [page for page in hits if page["part"] == part]
        chosen = same[0] if same else (hits[0] if len(hits) == 1 else None)
        return chosen

    cfr_re = re.compile(
        r"(?:§§|§|sections?|17\s*C\.?F\.?R\.?)\s*"
        r"(\d{3}\.[0-9]+(?:[A-Za-z]\d*)?(?:-[0-9]+[A-Za-z]?)?)"
        r"(?:\(([A-Za-z0-9]+)\))?(?:\(([A-Za-z0-9]+)\))?(?:\(([A-Za-z0-9]+)\))?",
        re.I,
    )
    rule_re = re.compile(
        r"\bRules?\s+([0-9]+[A-Za-z]?(?:\d+)?(?:-[0-9]+[A-Za-z]?)?)",
    )
    item_re = re.compile(
        r"\bItem\s+(\d{2,4})(?:\(([A-Za-z0-9]+)\))?(?:\s+of\s+(?:Regulation\s+S-K|S-K))?",
        re.I,
    )
    reg_re = re.compile(
        r"\bRegulation\s+(S-K|S-X|D|S|A|14A|13D-G|13D)\b",
    )
    usc_re = re.compile(
        r"\b15\s*U\.?\s*S\.?\s*C\.?\s*§?\s*([0-9]+[a-z]?(?:-\d+)?)"
        r"(?:\(([A-Za-z0-9]+)\))?(?:\(([A-Za-z0-9]+)\))?",
        re.I,
    )
    act_re = re.compile(
        r"\bsections?\s+(\d+)([A-Z])?"
        r"(?:\(([A-Za-z0-9]+)\))?(?:\(([A-Za-z0-9]+)\))?(?:\(([A-Za-z0-9]+)\))?"
        r"\s+of\s+the\s+(Securities Act|Exchange Act|Trust Indenture Act|Act)\b",
        re.I,
    )

    cross = defaultdict(lambda: {"rules": [], "forms": []})

    def add_rule_link(act: str, key: str, page: dict) -> None:
        info = statutes["act"].get((act, key.upper()))
        if not info or page.get("parent"):
            return
        key_name = "forms" if page["part"] in {"239", "249"} else "rules"
        bucket = cross[info["path"]][key_name]
        if any(item["path"] == page["path"] for item in bucket):
            return
        if len(bucket) >= 24:
            return
        bucket.append({"path": page["path"], "label": page["label"]})

    def link_text(text: str, page: dict) -> str:
        matches = []

        def consider(match, href, label=None):
            if not href:
                return
            matches.append((match.start(), match.end(), match.group(0), href))

        for match in cfr_re.finditer(text):
            ident = match.group(1)
            target = by_id.get(ident)
            if not target:
                continue
            bits = [b for b in match.groups()[1:] if b]
            href = anchor_target.get((ident, "-".join(bits))) or anchor_target.get((ident, bits[0] if bits else "")) or target["path"]
            if bits and (ident, "-".join(bits)) in anchor_target:
                href = anchor_target[(ident, "-".join(bits))]
            elif bits and (ident, bits[0]) in anchor_target:
                href = anchor_target[(ident, bits[0])]
            else:
                href = target["path"]
            consider(match, href)
        for match in rule_re.finditer(text):
            target = rule_target(match.group(1), page["part"])
            if target and target["path"] != page["path"]:
                consider(match, target["path"])
        for match in item_re.finditer(text):
            phrase = match.group(0)
            if page["part"] != "229" and "S-K" not in phrase and "Regulation" not in phrase:
                continue
            target = item_alias.get(match.group(1))
            if not target:
                continue
            bit = match.group(2)
            href = target["path"]
            if bit and (target["id"], bit) in anchor_target:
                href = anchor_target[(target["id"], bit)]
            consider(match, href)
        for match in reg_re.finditer(text):
            name = match.group(1).upper()
            href = {
                "S-K": "rules/17-cfr-229/",
                "S-X": "rules/17-cfr-210/",
                "D": groups_by_part.get(("230", "regulation d")),
                "S": groups_by_part.get(("230", "regulation s")),
                "A": groups_by_part.get(("230", "regulation a")),
                "14A": "rules/17-cfr-240/rule-14a-1/",
                "13D-G": "rules/17-cfr-240/rule-13d-1/",
                "13D": "rules/17-cfr-240/rule-13d-1/",
            }.get(name)
            consider(match, href)
        for match in usc_re.finditer(text):
            info = statutes["usc"].get(match.group(1).lower())
            if not info:
                continue
            bits = [b for b in match.groups()[1:] if b]
            href = info["path"] + hash_for(info, bits)
            consider(match, href)
            if not page.get("parent"):
                add_rule_link(info["act"], next(k for (a, k), v in statutes["act"].items() if v is info), page) if False else None
                key_name = "forms" if page["part"] in {"239", "249"} else "rules"
                bucket = cross[info["path"]][key_name]
                if not any(item["path"] == page["path"] for item in bucket) and len(bucket) < 24 and not page.get("parent"):
                    bucket.append({"path": page["path"], "label": page["label"]})
        for match in act_re.finditer(text):
            name = match.group(6).lower()
            act = ACT_NAME.get(name) or act_for_part(page["part"])
            if name == "act":
                act = act_for_part(page["part"])
            if not act:
                continue
            key = match.group(1) + (match.group(2) or "")
            info = statutes["act"].get((act, key.upper()))
            if not info:
                continue
            bits = [b for b in (match.group(3), match.group(4), match.group(5)) if b]
            href = info["path"] + hash_for(info, bits)
            consider(match, href)
            if not page.get("parent"):
                add_rule_link(act, key, page)

        if not matches:
            return text
        matches.sort(key=lambda item: (item[0], -(item[1] - item[0])))
        chosen = []
        cursor = 0
        for start, end, raw, href in matches:
            if start < cursor:
                continue
            chosen.append((start, end, raw, href))
            cursor = end
        out = []
        last = 0
        for start, end, raw, href in chosen:
            out.append(text[last:start])
            out.append(f'<a href="/{href.lstrip("/")}">{raw}</a>')
            last = end
        out.append(text[last:])
        return "".join(out)

    def link_html(html: str, page: dict) -> str:
        if not html:
            return html
        parts = re.split(r"(<[^>]+>)", html)
        for index, part in enumerate(parts):
            if not part or part.startswith("<"):
                continue
            parts[index] = link_text(part, page)
        return "".join(parts)

    for page in pages:
        page["html"] = link_html(page.get("html") or "", page)
        page["notesHtml"] = link_html(page.get("notesHtml") or "", page)

    # Section-level authority parentheticals: "15 U.S.C. 78j" and "Sec. 10".
    sec_re = re.compile(r"\bSec(?:tion|\.)\s+(\d+)([A-Z])?\b")
    for page in pages:
        if page.get("parent"):
            continue
        notes = re.sub(r"<[^>]+>", " ", page.get("notesHtml") or "")
        act = act_for_part(page["part"])
        if act and len(notes) < 500:
            for match in sec_re.finditer(notes):
                add_rule_link(act, match.group(1) + (match.group(2) or ""), page)

    for (act, key), spec in CURATED.items():
        info = statutes["act"].get((act, key.upper()))
        if not info:
            print(f"missing curated section {act} {key}")
            continue
        rules = []
        for ident in spec.get("rules", []):
            target = by_id.get(ident)
            if not target:
                print(f"missing curated rule {ident} for {act} {key}")
                continue
            rules.append({"path": target["path"], "label": spec.get("rule_labels", {}).get(ident, target["label"])})
        forms = [{"path": f"forms/{slug}/", "label": FORM_LABELS[slug]} for slug in spec.get("forms", [])]
        existing = cross[info["path"]]
        seen = {item["path"] for item in rules}
        merged_rules = rules + [item for item in existing["rules"] if item["path"] not in seen]
        existing["rules"] = merged_rules[:28]
        seen_forms = {item["path"] for item in forms}
        existing["forms"] = forms + [item for item in existing["forms"] if item["path"] not in seen_forms]

    # Expand §16 to every 16a and 16b rule we actually parsed.
    info16 = statutes["act"].get(("34-act", "16"))
    if info16:
        extra = []
        for page in pages:
            if page.get("parent"):
                continue
            rest = section_rest("240", page["id"]) if page["part"] == "240" else ""
            if rest.startswith("16a-") or rest.startswith("16b-"):
                extra.append({"path": page["path"], "label": page["label"]})
        bucket = cross[info16["path"]]["rules"]
        seen = {item["path"] for item in bucket}
        for item in extra:
            if item["path"] not in seen:
                bucket.append(item)
                seen.add(item["path"])

    return cross


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--download", action="store_true")
    args = parser.parse_args()
    ua = user_agent()
    date_path = CACHE / "date.txt"
    if args.download or not date_path.exists():
        date = issue_date(ua)
        date_path.parent.mkdir(parents=True, exist_ok=True)
        date_path.write_text(date)
        for part in PARTS:
            url = f"https://www.ecfr.gov/api/versioner/v1/full/{date}/title-17.xml?part={part}"
            dest = CACHE / f"part-{part}.xml"
            print(f"download {part}")
            fetch(url, dest, ua)
    else:
        date = date_path.read_text().strip()
    parsed = []
    for part in PARTS:
        xml = CACHE / f"part-{part}.xml"
        if not xml.exists():
            raise SystemExit(f"Missing {xml}. Re-run with --download.")
        print(f"parse {part}")
        parsed.append(parse_part(part, xml))
    pages = flatten(parsed)
    print(f"link {len(pages)} pages")
    statutes = load_statutes()
    groups_by_part = {}
    for part in parsed:
        for group in part["groups"]:
            heading = group["heading"].lower().replace("—", " ").replace("–", " ")
            for prefix in ("regulation d", "regulation s", "regulation a"):
                if heading.startswith(prefix) and (len(heading) == len(prefix) or heading[len(prefix)] == " "):
                    groups_by_part.setdefault((part["part"], prefix), f'{part["path"]}#{group["id"]}')
    cross = link_pages(pages, statutes, groups_by_part)
    OUT.mkdir(parents=True, exist_ok=True)
    # Drop chunk HTML from the parent record before writing; chunks are their own pages.
    for part in parsed:
        for section in part["sections"]:
            section.pop("bytes", None)
            for chunk in section["chunks"]:
                chunk.pop("html", None)
                chunk.pop("bytes", None)
        # Write per-part file without duplicating chunk bodies inside the parent... chunk html lives on flat pages.
    # Store full page bodies in the part file, including chunk pages, so the site has one file per part.
    by_part = defaultdict(list)
    for page in pages:
        page.pop("bytes", None)
        by_part[page["part"]].append(page)
    counts = {}
    for part in parsed:
        payload = {
            "part": part["part"],
            "name": part["name"],
            "blurb": part["blurb"],
            "heading": part["heading"],
            "path": part["path"],
            "date": date,
            "source": f"https://www.ecfr.gov/api/versioner/v1/full/{date}/title-17.xml?part={part['part']}",
            "groups": part["groups"],
            "sections": by_part[part["part"]],
        }
        dest = OUT / f"{part['part']}.json"
        dest.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
        counts[part["part"]] = len([p for p in by_part[part["part"]] if not p.get("parent")])
        print(f"wrote {dest.name} sections {counts[part['part']]} bytes {dest.stat().st_size}")
    manifest = {
        "date": date,
        "source": "eCFR versioner full XML, title 17",
        "parts": [
            {"part": part["part"], "name": part["name"], "blurb": part["blurb"], "path": part["path"], "sections": counts[part["part"]]}
            for part in parsed
        ],
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2))
    # statute links keyed by site path without a leading slash
    cleaned = {}
    for path, value in cross.items():
        if value["rules"] or value["forms"]:
            cleaned[path.strip("/")] = value
    (OUT / "statute-links.json").write_text(json.dumps(cleaned, indent=2, ensure_ascii=False))
    print(f"statute sections with links: {len(cleaned)}")
    largest = sorted(pages, key=lambda page: len(page.get("html") or ""), reverse=True)[:8]
    for page in largest:
        print(f"size {len(page.get('html') or ''):7d} {page['path']}")


if __name__ == "__main__":
    main()
