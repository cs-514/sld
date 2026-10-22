#!/usr/bin/env python3
"""Build the Securities Act / Exchange Act / Trust Indenture Act index
from the Office of the Law Revision Counsel USLM XML for Title 15.

The XML is the current House download (release point encoded in the file).
Section numbers of the Acts are taken from the official source credit
(for example "ch. 38, title I, § 5"), not from an external crosswalk.

Operative text is rendered from the USLM. Source credits and amendment
notes are kept separate so a section page can collapse them under the text.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from lxml import etree

from statute_text import render_statute, resolve_usc_links

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "data" / "cache"
OUT_DIR = ROOT / "src" / "data" / "statutes"

NS = {"u": "http://xml.house.gov/schemas/uslm/1.0"}
U = "{http://xml.house.gov/schemas/uslm/1.0}"
DOWNLOAD_PAGE = "https://uscode.house.gov/download.html"
UA = "SecReg Portal/1.0 (securities statute research; contact: GitHub cs-514)"

STRUCT = {
    "subsection",
    "paragraph",
    "subparagraph",
    "clause",
    "subclause",
}
MAX_DEPTH = 3  # subsection, paragraph, subparagraph
WIDE_CUTOFF = 36

DASH = r"[\u2010\u2011\u2012\u2013\u2014-]"
PUB_RE = re.compile(rf"Pub\.\s*L\.\s*(\d+)\s*{DASH}\s*(\d+)")
# Originating Act section: the first "ch. 38/404, title N, § X" in the source credit.
ACT_RE = re.compile(
    rf"ch\.\s*(38|404)\s*,\s*title\s+(I{{1,3}}|[123])\s*,\s*§(?!§)\s*(\d+[A-Z]?)\b"
)
SCHED_RE = re.compile(
    r"ch\.\s*38\s*,\s*title\s+I\s*,\s*schedules?\s+([A-Z](?:\s*,\s*[A-Z])*)",
    re.IGNORECASE,
)
ADDED_RE = re.compile(r"as added\b(.{0,400})", re.IGNORECASE)
TERM_RE = re.compile(
    r"""^The\s+terms?\s+((?:[“"][^”"]+[”"]\s*(?:,|and|or)?\s*)+)""",
    re.IGNORECASE,
)
QUOTE_RE = re.compile(r"[“\"]([^”\"]+)[”\"]")

# Popular names are applied only as labels on a public law number that was
# extracted from the source credit. The number remains the authority.
POPULAR = {
    "107-204": "Sarbanes-Oxley Act of 2002",
    "112-106": "JOBS Act",
    "111-203": "Dodd-Frank Act",
    "114-94": "FAST Act",
    "104-67": "Private Securities Litigation Reform Act of 1995",
    "105-353": "Securities Litigation Uniform Standards Act of 1998",
    "104-290": "National Securities Markets Improvement Act of 1996",
    "94-29": "Securities Acts Amendments of 1975",
    "100-704": "Insider Trading and Securities Fraud Enforcement Act of 1988",
    "101-429": "Securities Enforcement Remedies and Penny Stock Reform Act of 1990",
    "109-291": "Credit Rating Agency Reform Act of 2006",
    "95-213": "Foreign Corrupt Practices Act of 1977",
}

CHAPTERS = {
    "/us/usc/t15/ch2A": "2A",
    "/us/usc/t15/ch2B": "2B",
}


def local(el) -> str:
    return etree.QName(el).localname


def collapse(value: str | None) -> str:
    if not value:
        return ""
    return " ".join(value.split())


def text(el) -> str:
    if el is None:
        return ""
    return collapse("".join(el.itertext()))


def download_zip(dest: Path) -> str:
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(DOWNLOAD_PAGE, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        html = resp.read().decode("utf-8", "replace")
    match = re.search(r'href="(download/releasepoints/[^"]*xml_usc15@[^"]+\.zip)"', html)
    if not match:
        raise SystemExit("Could not find the Title 15 XML link on the House download page.")
    url = "https://uscode.house.gov/" + match.group(1)
    print(f"Downloading {url}", file=sys.stderr)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=180) as resp, dest.open("wb") as out:
        while True:
            chunk = resp.read(1 << 20)
            if not chunk:
                break
            out.write(chunk)
    return url


def load_root(zip_path: Path) -> etree._Element:
    with zipfile.ZipFile(zip_path) as zf:
        name = next(n for n in zf.namelist() if n.endswith(".xml"))
        data = zf.read(name)
    return etree.fromstring(data)


def release_meta(root) -> dict:
    def meta_text(tag: str) -> str:
        el = root.find(f"u:meta/u:{tag}", NS)
        if el is None:
            el = root.find(f"{{http://xml.house.gov/schemas/uslm/1.0}}meta/{{http://xml.house.gov/schemas/uslm/1.0}}{tag}")
        return text(el)

    # dc: elements are in another namespace; search by local name.
    meta = root.find(f"{U}meta")
    fields = {}
    if meta is not None:
        for child in meta:
            fields[local(child)] = text(child)
    note = root.find(f".//{U}title/{U}note/{U}p")
    return {
        "docPublicationName": fields.get("docPublicationName", ""),
        "created": fields.get("created", ""),
        "currencyNote": text(note),
        "positiveLaw": fields.get("property", ""),
    }


def pub_laws(credit: str) -> list[dict]:
    seen = []
    out = []
    for num, suffix in PUB_RE.findall(credit or ""):
        key = f"{int(num)}-{int(suffix)}"
        if key in seen:
            continue
        seen.append(key)
        item = {"pubLaw": key}
        # Financial Data Transparency Act is a specific division of Pub. L. 117-263,
        # not the entire defense authorization.
        if key == "117-263" and re.search(r"title\s+LVIII|§\s*5821", credit):
            item["popularName"] = "Financial Data Transparency Act (NDAA FY2023 § 5821)"
        elif key in POPULAR:
            item["popularName"] = POPULAR[key]
        out.append(item)
    return out


def added_by(credit: str) -> dict | None:
    match = ADDED_RE.search(credit or "")
    if not match:
        return None
    # Stop at the first amendment clause so a later Pub. L. is not treated as the adding act.
    window = re.split(r";|\bamended\b", match.group(1), maxsplit=1)[0]
    raw = collapse(window)
    raw = re.sub(r"[\s.;)]+$", "", raw)
    pubs = pub_laws(raw)
    if not pubs:
        return {"raw": raw[:240]} if raw else None
    item = dict(pubs[0])
    item["raw"] = raw[:240]
    return item


def classify(credit: str) -> dict:
    """Map a source credit to an Act section.

    The first ch. 38 / ch. 404 citation is the codified Act section.
    Later citations in the same credit are amendments.
    """
    result = {
        "actId": None,
        "actTitle": None,
        "actSection": None,
        "schedule": None,
        "origin": None,
    }
    if not credit:
        return result
    sched = SCHED_RE.search(credit)
    match = ACT_RE.search(credit)
    if match:
        chapter, title, section = match.group(1), match.group(2), match.group(3)
        title = {"1": "I", "2": "II", "3": "III"}.get(title, title)
        result["actTitle"] = title
        result["actSection"] = section
        result["origin"] = f"ch. {chapter}, title {title}, § {section}"
        if chapter == "38" and title in {"I", "II"}:
            result["actId"] = "33-act"
        elif chapter == "38" and title == "III":
            result["actId"] = "tia"
        elif chapter == "404" and title == "I":
            result["actId"] = "34-act"
        return result
    if sched:
        letters = re.findall(r"[A-Z]", sched.group(1))
        result["actId"] = "33-act"
        result["actTitle"] = "I"
        result["schedule"] = letters
        result["origin"] = "ch. 38, title I, schedules " + ", ".join(letters)
    return result


def usc_slug(value: str) -> str:
    return (
        value.replace("–", "-")
        .replace("—", "-")
        .replace("−", "-")
        .replace(" ", "")
        .lower()
    )


def clean_num(el) -> str:
    raw = el.find(f"{U}num")
    value = text(raw)
    value = value.strip()
    return value


def direct_heading(el) -> str:
    for child in el:
        if local(child) == "heading":
            return text(child)
    return ""


def direct_prose(el) -> str:
    parts = []
    for child in el:
        if local(child) in {"chapeau", "content", "continuation"}:
            parts.append(text(child))
    return collapse(" ".join(parts))


def defined_terms(prose: str) -> list[str]:
    if not prose:
        return []
    match = TERM_RE.match(prose[:500])
    if not match:
        return []
    terms = []
    for term in QUOTE_RE.findall(match.group(1)):
        term = collapse(term)
        if term and term not in terms:
            terms.append(term)
    return terms[:6]


def anchor_piece(num: str) -> str:
    return num.strip("() ").replace(" ", "")


def build_outline(parent, depth: int, prefix: list[str]) -> list[dict]:
    children = [c for c in parent if local(c) in STRUCT]
    nodes = []
    for child in children:
        num = clean_num(child)
        heading = direct_heading(child)
        terms = defined_terms(direct_prose(child))
        chain = prefix + ([anchor_piece(num)] if num else [])
        kids = build_outline(child, depth + 1, chain) if depth + 1 < MAX_DEPTH else []
        keep = depth == 0 or bool(heading) or bool(terms) or bool(kids) or len(children) <= WIDE_CUTOFF
        if not keep:
            continue
        node = {
            "num": num,
            "anchor": "-".join(p for p in chain if p),
        }
        if heading:
            node["heading"] = heading
        if terms:
            node["terms"] = terms
        if kids:
            node["children"] = kids
        nodes.append(node)
    return nodes


def section_status(sec, heading: str) -> str:
    status = (sec.get("status") or "").lower()
    if status in {"repealed", "omitted", "transferred", "reserved"}:
        return status
    head = heading.lower()
    if head.startswith("repealed"):
        return "repealed"
    if head.startswith("omitted"):
        return "omitted"
    if head.startswith("transferred"):
        return "transferred"
    if head.startswith("repealed."):
        return "repealed"
    return "active"


def slug_for(info: dict, usc: str) -> str:
    if info.get("schedule"):
        # Schedules A and B share one Code section. One permalink.
        return "schedule-" + info["schedule"][0].lower()
    if info.get("actSection"):
        return "section-" + info["actSection"].lower()
    return "usc-" + usc_slug(usc)


def links_for(slug: str) -> dict:
    return {
        "house": (
            "https://uscode.house.gov/view.xhtml?"
            f"req=granuleid:USC-prelim-title15-section{slug}&num=0&edition=prelim"
        ),
        "govinfo": f"https://www.govinfo.gov/link/uscode/15/{slug}",
        "lii": f"https://www.law.cornell.edu/uscode/text/15/{slug}",
    }


def act_sort_key(section: dict) -> tuple:
    group = {"I": 0, "II": 1, "III": 2}.get(section.get("actTitle") or "", 9)
    if section.get("schedule"):
        return (group, 1, 0, ",".join(section["schedule"]), section["order"])
    raw = section.get("actSection") or ""
    match = re.match(r"(\d+)([A-Z]*)", raw)
    if not match:
        return (5, 0, 9999, raw, section["order"])
    return (group, 0, int(match.group(1)), match.group(2), section["order"])


def build_section(sec, order: int, subchapter: dict | None) -> dict:
    num_el = sec.find(f"{U}num")
    value = (num_el.get("value") if num_el is not None else "") or ""
    if not value:
        value = text(num_el).lstrip("§").strip(" .")
    heading = direct_heading(sec)
    credits = [text(el) for el in sec.findall(f"{U}sourceCredit")]
    credit = " ".join(c for c in credits if c).strip()
    info = classify(credit)
    status = section_status(sec, heading)
    slug_usc = usc_slug(value)
    laws = pub_laws(credit)
    added = added_by(credit)
    record = {
        "usc": value.replace("-", "–") if "–" not in value else value,
        "uscSlug": slug_usc,
        "uscCite": f"15 U.S.C. § {value}",
        "heading": heading,
        "status": status,
        "identifier": sec.get("identifier") or "",
        "order": order,
        "sourceCredit": credit,
        "publicLaws": laws,
        "addedBy": added,
        "outline": build_outline(sec, 0, []),
        "textHtml": "",
        "notesHtml": "",
        "links": links_for(slug_usc),
        # Empty on purpose. Step 2–4 append rules, forms, releases, and C&DIs.
        "crossLinks": {
            "rules": [],
            "forms": [],
            "releases": [],
            "interpretations": [],
            "amendingActs": [],
        },
    }
    if subchapter:
        record["subchapter"] = subchapter
    record.update({k: v for k, v in info.items() if v not in (None, [], "") or k in {"actId", "actSection", "actTitle"}})
    # Drop empty optional classification fields for a smaller file, but keep nulls
    # that callers branch on.
    for key in ("actId", "actTitle", "actSection", "schedule", "origin"):
        if key not in record:
            record[key] = None
    record["slug"] = slug_for(info, value)
    record["label"] = section_label(record)
    return record


def section_label(record: dict) -> str:
    if record.get("schedule"):
        letters = record["schedule"]
        if len(letters) == 1:
            return f"Schedule {letters[0]}"
        return "Schedules " + " and ".join(letters)
    if record.get("actSection"):
        return f"Section {record['actSection']}"
    return record["uscCite"]


ACT_META = {
    "33-act": {
        "id": "33-act",
        "shortName": "Securities Act of 1933",
        "titleName": "Securities Act",
        "path": "/33-act/",
        "chapter": "2A",
        "sessionCite": "ch. 38, 48 Stat. 74",
        "enacted": "1933-05-27",
        "scope": "Title I (domestic securities) and Title II (Corporation of Foreign Security Holders). Title III is the Trust Indenture Act and is indexed separately.",
    },
    "34-act": {
        "id": "34-act",
        "shortName": "Securities Exchange Act of 1934",
        "titleName": "Exchange Act",
        "path": "/34-act/",
        "chapter": "2B",
        "sessionCite": "ch. 404, 48 Stat. 881",
        "enacted": "1934-06-06",
        "scope": "Title I of the Exchange Act, plus other provisions Congress codified in chapter 2B without an Exchange Act section number.",
    },
    "tia": {
        "id": "tia",
        "shortName": "Trust Indenture Act of 1939",
        "titleName": "Trust Indenture Act",
        "path": "/tia/",
        "chapter": "2A",
        "sessionCite": "ch. 411, 53 Stat. 1149 (codified as Title III of ch. 38)",
        "enacted": "1939-08-03",
        "scope": "Title III of the Securities Act chapter. Cited as Trust Indenture Act sections, not as Securities Act sections.",
    },
}


def assign_home(record: dict, chapter: str) -> str:
    if record.get("actId"):
        return record["actId"]
    return "33-act" if chapter == "2A" else "34-act"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", dest="zip_path", type=Path, help="Existing Title 15 XML zip")
    parser.add_argument("--download", action="store_true", help="Download the current House Title 15 XML")
    args = parser.parse_args()

    source_url = None
    if args.download or not args.zip_path:
        CACHE.mkdir(parents=True, exist_ok=True)
        zip_path = CACHE / "usc15.zip"
        if args.download or not zip_path.exists():
            source_url = download_zip(zip_path)
        else:
            source_url = "cache"
    else:
        zip_path = args.zip_path
    if not zip_path.exists():
        raise SystemExit(f"Missing {zip_path}")

    digest = hashlib.sha256(zip_path.read_bytes()).hexdigest()
    root = load_root(zip_path)
    meta = release_meta(root)
    release_match = re.search(r"(\d+)-(\d+)", meta.get("docPublicationName") or "")
    if release_match and (not source_url or source_url in {"cache"} or str(source_url).startswith("/")):
        congress, law = release_match.group(1), release_match.group(2)
        source_url = (
            "https://uscode.house.gov/download/releasepoints/us/pl/"
            f"{congress}/{law}/xml_usc15@{congress}-{law}.zip"
        )

    buckets: dict[str, list[dict]] = {key: [] for key in ACT_META}
    order = 0
    seen_ids = set()
    for chapter_id, chapter_num in CHAPTERS.items():
        chapter = root.xpath(f'//u:chapter[@identifier="{chapter_id}"]', namespaces=NS)
        if not chapter:
            raise SystemExit(f"Missing {chapter_id}")
        chapter = chapter[0]
        for sec in chapter.xpath("./u:section | ./u:subchapter/u:section", namespaces=NS):
            ident = sec.get("identifier") or ""
            if not ident.startswith("/us/usc/t15/s"):
                continue
            if ident in seen_ids:
                continue
            seen_ids.add(ident)
            parent = sec.getparent()
            sub = None
            if parent is not None and local(parent) == "subchapter":
                sub = {
                    "id": (parent.get("identifier") or "").split("/")[-1],
                    "heading": direct_heading(parent),
                    "num": text(parent.find(f"{U}num")),
                }
            record = build_section(sec, order, sub)
            text_html, notes_html = render_statute(sec)
            record["textHtml"] = text_html
            record["notesHtml"] = notes_html
            order += 1
            home = assign_home(record, chapter_num)
            record["homeAct"] = home
            record["chapter"] = chapter_num
            buckets[home].append(record)

    # Paths and prev/next in official Code order, within each act index.
    for act_id, sections in buckets.items():
        base = ACT_META[act_id]["path"]
        for section in sections:
            section["path"] = f"{base}{section['slug']}/"
        for index, section in enumerate(sections):
            section["prev"] = (
                {"path": sections[index - 1]["path"], "label": sections[index - 1]["label"]}
                if index > 0
                else None
            )
            section["next"] = (
                {"path": sections[index + 1]["path"], "label": sections[index + 1]["label"]}
                if index + 1 < len(sections)
                else None
            )
        sections.sort(key=lambda s: (0 if s.get("actSection") or s.get("schedule") else 1, act_sort_key(s)))

    ident_to_path = {
        section["identifier"]: section["path"]
        for sections in buckets.values()
        for section in sections
        if section.get("identifier")
    }
    for sections in buckets.values():
        for section in sections:
            section["textHtml"] = resolve_usc_links(section["textHtml"], ident_to_path)
            section["notesHtml"] = resolve_usc_links(section["notesHtml"], ident_to_path)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    provenance = {
        "generatedAt": generated,
        "source": source_url or str(zip_path),
        "zipSha256": digest,
        "release": meta,
        "downloadPage": DOWNLOAD_PAGE,
        "method": "Act section numbers are the first ch. 38 or ch. 404 section citation in the OLRC source credit. Operative text, subdivision anchors, source credits, and amendment notes are rendered from the same USLM file.",
        "counts": {act_id: len(sections) for act_id, sections in buckets.items()},
    }
    (OUT_DIR / "provenance.json").write_text(json.dumps(provenance, indent=2, ensure_ascii=False) + "\n")

    for act_id, sections in buckets.items():
        # Restore Code order for the file the site renders (prev/next follow this order).
        sections.sort(key=lambda s: s["order"])
        payload = {
            "act": ACT_META[act_id],
            "provenance": provenance,
            "sections": sections,
        }
        path = OUT_DIR / f"{act_id}.json"
        path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
        act_sections = [s for s in sections if s.get("actSection") or s.get("schedule")]
        related = [s for s in sections if not s.get("actSection") and not s.get("schedule")]
        print(
            f"{act_id}: {len(sections)} sections "
            f"({len(act_sections)} act sections, {len(related)} related)"
        )

    # Spot-check the mapping lawyers use every day. Fail the build if it drifts.
    by_act_section = {}
    for act_id, sections in buckets.items():
        for section in sections:
            if section.get("actSection"):
                by_act_section[(act_id, section["actSection"])] = section["uscSlug"]
    expected = {
        ("33-act", "1"): "77a",
        ("33-act", "2"): "77b",
        ("33-act", "2A"): "77b-1",
        ("33-act", "4"): "77d",
        ("33-act", "4A"): "77d-1",
        ("33-act", "5"): "77e",
        ("33-act", "11"): "77k",
        ("33-act", "12"): "77l",
        ("33-act", "17"): "77q",
        ("33-act", "27B"): "77z-2a",
        ("33-act", "29"): "77z-4",
        ("tia", "301"): "77aaa",
        ("tia", "304"): "77ddd",
        ("34-act", "1"): "78a",
        ("34-act", "10"): "78j",
        ("34-act", "10A"): "78j-1",
        ("34-act", "10B"): "78j-2",
        ("34-act", "10D"): "78j-4",
        ("34-act", "12"): "78l",
        ("34-act", "13"): "78m",
        ("34-act", "14"): "78n",
        ("34-act", "14A"): "78n-1",
        ("34-act", "15D"): "78o-6",
        ("34-act", "15E"): "78o-7",
        ("34-act", "16"): "78p",
        ("34-act", "21F"): "78u-6",
        ("34-act", "30A"): "78dd-1",
        ("34-act", "41"): "78rr",
    }
    failed = False
    for key, usc in expected.items():
        got = by_act_section.get(key)
        if got != usc:
            print(f"MAPPING MISMATCH {key}: expected {usc}, got {got}", file=sys.stderr)
            failed = True
    # The research-safe-harbor note quoted inside Section 5 must not become its own section.
    headings = [s["heading"] for sections in buckets.values() for s in sections]
    if any("SAFE HARBOR FOR INVESTMENT FUND RESEARCH" in h for h in headings):
        print("Nested statutory note was indexed as a section", file=sys.stderr)
        failed = True
    section5 = next(s for s in buckets["33-act"] if s.get("actSection") == "5")
    section10 = next(s for s in buckets["34-act"] if s.get("actSection") == "10")
    if "registration statement" not in section5["textHtml"] or 'id="a-1"' not in section5["textHtml"]:
        print("Section 5 text missing", file=sys.stderr)
        failed = True
    if 'id="b"' not in section10["textHtml"] or "purchase or sale" not in section10["textHtml"]:
        print("Section 10(b) text missing", file=sys.stderr)
        failed = True
    if not any('id="' in s["textHtml"] and re.search(r'id="[a-z]+-\d+-[A-Z]', s["textHtml"]) for sections in buckets.values() for s in sections):
        print("No subparagraph anchor such as #b-2-A", file=sys.stderr)
        failed = True
    if failed:
        raise SystemExit(1)
    print(f"Wrote {OUT_DIR} (sha256 {digest[:12]})")


if __name__ == "__main__":
    main()
