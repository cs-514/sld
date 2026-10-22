"""Render operative statutory text from OLRC USLM.

The text is United States government work. Subdivision anchors follow the
Code's own identifier path: /us/usc/t15/s78j/b becomes #b, and
/us/usc/t15/s77e/a/1 becomes #a-1.
"""

from __future__ import annotations

import html
import re

U = "{http://xml.house.gov/schemas/uslm/1.0}"

STRUCT = {
    "subsection",
    "paragraph",
    "subparagraph",
    "clause",
    "subclause",
    "item",
    "subitem",
    "level",
}
PROSE = {"chapeau", "content", "continuation", "p", "proviso"}
NOTE_TOPICS = {
    "amendments",
    "prospectiveAmendment",
    "referencesInText",
    "codification",
    "effectiveDate",
    "effectiveDateOfAmendment",
    "priorProvisions",
    "savings",
    "repeals",
    "separability",
}


def local(el) -> str:
    return el.tag.split("}")[-1]


def collapse(value: str | None) -> str:
    if not value:
        return ""
    return " ".join(value.split())


def norm(value: str | None) -> str:
    """Collapse whitespace inside a text node and escape it. Keep one edge space."""
    if not value:
        return ""
    lead = value[0].isspace()
    trail = value[-1].isspace()
    core = " ".join(value.split())
    if not core:
        return " " if lead or trail else ""
    return (" " if lead else "") + html.escape(core, quote=False) + (" " if trail else "")


def inline(el) -> str:
    parts: list[str] = []
    if el.text:
        parts.append(norm(el.text))
    for child in el:
        parts.append(inline_child(child))
        if child.tail:
            parts.append(norm(child.tail))
    return "".join(parts)


def inline_child(child) -> str:
    kind = local(child)
    if kind == "i":
        return f"<i>{inline(child)}</i>"
    if kind == "b":
        return f"<b>{inline(child)}</b>"
    if kind == "sup":
        return f"<sup>{inline(child)}</sup>"
    if kind == "sub":
        return f"<sub>{inline(child)}</sub>"
    if kind == "inline" and child.get("class") == "small-caps":
        return f'<span class="sc">{inline(child)}</span>'
    if kind == "note" and child.get("type") == "footnote":
        parts: list[str] = []
        if child.text:
            parts.append(norm(child.text))
        for grand in child:
            if local(grand) == "num":
                if grand.tail:
                    parts.append(norm(grand.tail))
                continue
            parts.append(inline_child(grand))
            if grand.tail:
                parts.append(norm(grand.tail))
        body = " ".join("".join(parts).split())
        return f' <span class="ed">{body}</span>' if body else ""
    if kind == "table":
        return render_table(child)
    if kind == "ref" and child.get("class") == "footnoteRef":
        return f"<sup>{inline(child).strip()}</sup>"
    if kind == "ref":
        return render_ref(child)
    return inline(child)


def render_ref(el) -> str:
    label = inline(el)
    href = el.get("href") or ""
    if href.startswith("/us/usc/"):
        return f'<a href="USC:{html.escape(href, quote=True)}">{label}</a>'
    return label


def render_table(el) -> str:
    rows = []
    for tr in el.iter(f"{U}tr"):
        cells = []
        for cell in tr:
            kind = local(cell)
            if kind not in {"td", "th"}:
                continue
            cells.append(f"<{kind}>{inline(cell).strip()}</{kind}>")
        if cells:
            rows.append("<tr>" + "".join(cells) + "</tr>")
    if not rows:
        text = inline(el).strip()
        return text
    return '<div class="tw"><table>' + "".join(rows) + "</table></div>"


def prose_blocks(el) -> list[str]:
    kind = local(el)
    if kind == "table":
        rendered = render_table(el)
        return [rendered] if rendered else []
    if kind == "note":
        body = " ".join(inline(el).split())
        return [f'<span class="ed">{body}</span>'] if body else []
    if any(local(child) in {"p", "table"} for child in el):
        blocks: list[str] = []
        lead: list[str] = []
        if el.text:
            lead.append(norm(el.text))
        for child in el:
            if local(child) in {"p", "table"}:
                chunk = "".join(lead).strip()
                if chunk:
                    blocks.append(chunk)
                lead = []
                if local(child) == "table":
                    table = render_table(child)
                    if table:
                        blocks.append(table)
                else:
                    inner = inline(child).strip()
                    if inner:
                        blocks.append(inner)
            else:
                lead.append(inline_child(child))
            if child.tail:
                lead.append(norm(child.tail))
        chunk = "".join(lead).strip()
        if chunk:
            blocks.append(chunk)
        return blocks
    text = inline(el).strip()
    return [text] if text else []


def anchor_for(el, section_ident: str, chain: list[str]) -> str:
    ident = el.get("identifier") or ""
    prefix = section_ident + "/"
    if section_ident and ident.startswith(prefix):
        return ident[len(prefix) :].replace("/", "-").replace("–", "-").replace("—", "-")
    num = el.find(f"{U}num")
    piece = ""
    if num is not None:
        piece = (num.get("value") or "").strip() or collapse("".join(num.itertext())).strip("() ")
    piece = piece.replace(" ", "")
    if not piece:
        return ""
    return "-".join([*chain, piece])


def unique_anchor(anchor: str, used: set[str]) -> str:
    if not anchor:
        return ""
    if anchor not in used:
        used.add(anchor)
        return anchor
    n = 2
    while f"{anchor}-{n}" in used:
        n += 1
    key = f"{anchor}-{n}"
    used.add(key)
    return key


def direct_heading(el) -> str:
    for child in el:
        if local(child) == "heading":
            return collapse("".join(child.itertext()))
    return ""


def num_text(el) -> str:
    num = el.find(f"{U}num")
    if num is None:
        return ""
    raw = collapse("".join(num.itertext()))
    return raw.lstrip("“\"'")


def render_division(el, section_ident: str, chain: list[str], used: set[str], is_section: bool) -> str:
    anchor = "" if is_section else unique_anchor(anchor_for(el, section_ident, chain), used)
    num = "" if is_section else num_text(el)
    heading = "" if is_section else direct_heading(el)
    took_num = False
    took_heading = False
    chunks: list[tuple[str, object]] = []
    prose: list = []

    def flush() -> None:
        nonlocal prose
        if prose:
            chunks.append(("prose", prose))
            prose = []

    for child in el:
        kind = local(child)
        if kind == "num" and not took_num:
            took_num = True
            continue
        if kind == "heading" and not took_heading:
            took_heading = True
            continue
        if kind in {"sourceCredit", "notes"}:
            continue
        if kind in STRUCT:
            flush()
            chunks.append(("struct", child))
        else:
            prose.append(child)
    flush()

    lead = ""
    if num:
        if anchor:
            lead += f'<a class="n" href="#{html.escape(anchor, quote=True)}">{html.escape(num)}</a> '
        else:
            lead += html.escape(num) + " "
    if heading:
        lead += f"<b>{html.escape(heading)}</b> "

    parts: list[str] = []
    placed_lead = False
    next_chain = chain if is_section or not anchor else [*chain, anchor.split("-")[-1]]
    # Child anchors come from identifiers, so the chain is only a fallback.
    for kind, payload in chunks:
        if kind == "prose":
            blocks: list[str] = []
            for node in payload:  # type: ignore[union-attr]
                blocks.extend(prose_blocks(node))
            for block in blocks:
                if block.startswith("<div class=\"tw\">") or block.startswith("<table"):
                    if not placed_lead and lead:
                        parts.append(f"<p>{lead.strip()}</p>")
                        placed_lead = True
                    parts.append(block)
                    continue
                if not placed_lead:
                    parts.append(f"<p>{lead}{block}</p>")
                    placed_lead = True
                else:
                    parts.append(f"<p>{block}</p>")
        else:
            if not placed_lead and lead:
                parts.append(f"<p>{lead.strip()}</p>")
                placed_lead = True
            parts.append(render_division(payload, section_ident, next_chain, used, False))
    if not placed_lead and lead:
        parts.append(f"<p>{lead.strip()}</p>")

    body = "".join(parts)
    if is_section:
        return body
    id_attr = f' id="{html.escape(anchor, quote=True)}"' if anchor else ""
    return f'<div class="s"{id_attr}>{body}</div>'


def jump_nav(el, section_ident: str) -> str:
    links = []
    for child in el:
        if local(child) not in STRUCT:
            continue
        anchor = anchor_for(child, section_ident, [])
        if not anchor:
            continue
        num = num_text(child) or anchor
        heading = direct_heading(child)
        title = f' title="{html.escape(heading, quote=True)}"' if heading else ""
        links.append(
            f'<a href="#{html.escape(anchor, quote=True)}"{title}>{html.escape(num)}</a>'
        )
    if len(links) < 2:
        return ""
    return '<nav class="jump" aria-label="Subsections">' + "".join(links) + "</nav>"


def render_notes(el) -> str:
    blocks: list[str] = []
    for credit in el.findall(f"{U}sourceCredit"):
        text = collapse("".join(credit.itertext()))
        if text:
            blocks.append(f"<p>{html.escape(text)}</p>")
    notes = el.find(f"{U}notes")
    if notes is not None:
        for note in notes:
            if local(note) != "note":
                continue
            if (note.get("topic") or "") not in NOTE_TOPICS:
                continue
            heading = direct_heading(note)
            paragraphs = []
            for para in note.findall(f"{U}p"):
                text = inline(para).strip()
                if text:
                    paragraphs.append(f"<p>{text}</p>")
            if not paragraphs:
                continue
            head = f"<h3>{html.escape(heading)}</h3>" if heading else ""
            blocks.append(head + "".join(paragraphs))
    if not blocks:
        return ""
    return (
        '<details class="amendments" data-pagefind-ignore>'
        "<summary>Source credit and amendment notes</summary>"
        + "".join(blocks)
        + "</details>"
    )


def render_statute(section_el) -> tuple[str, str]:
    ident = section_el.get("identifier") or ""
    used: set[str] = set()
    body = render_division(section_el, ident, [], used, True)
    nav = jump_nav(section_el, ident)
    text_html = f'<div class="statute">{nav}{body}</div>' if (nav or body) else ""
    return text_html, render_notes(section_el)


def house_section(href: str) -> str | None:
    match = re.match(r"/us/usc/t(\d+)/s([^/]+)", href)
    if not match:
        return None
    title, sec = match.group(1), match.group(2)
    sec = sec.replace("–", "-").replace("—", "-").replace("−", "-")
    return (
        "https://uscode.house.gov/view.xhtml?"
        f"req=granuleid:USC-prelim-title{title}-section{sec}&num=0&edition=prelim"
    )


def resolve_usc_links(fragment: str, ident_to_path: dict[str, str]) -> str:
    def repl(match: re.Match) -> str:
        href = match.group(1)
        parsed = re.match(r"(/us/usc/t15/s[^/]+)(/.*)?$", href)
        if parsed:
            ident, rest = parsed.group(1), (parsed.group(2) or "").strip("/")
            path = ident_to_path.get(ident)
            if path:
                if rest:
                    return f'href="{path}#{rest.replace("/", "-")}"'
                return f'href="{path}"'
        house = house_section(href)
        if house:
            return f'href="{house}"'
        return 'data-nolink="1"'

    resolved = re.sub(r'href="USC:([^"]*)"', repl, fragment)
    return re.sub(r"<a data-nolink=\"1\">(.*?)</a>", r"\1", resolved)
