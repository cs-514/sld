import { href } from "../lib/paths";
import { FORM_QUERIES } from "../lib/forms";

type Issuer = [ticker: string, name: string, cik: number, exchange: string, slug: string];
type Hit = { href: string; title: string; meta: string; excerpt?: string; kind: string };

let issuersPromise: Promise<Issuer[]> | null = null;

function loadIssuers(): Promise<Issuer[]> {
  if (!issuersPromise) {
    issuersPromise = fetch(href("data/issuers.json")).then((response) => {
      if (!response.ok) throw new Error(`Issuer index ${response.status}`);
      return response.json() as Promise<Issuer[]>;
    });
  }
  return issuersPromise;
}

function matchIssuers(rows: Issuer[], query: string): Hit[] {
  const q = query.trim().toLowerCase();
  if (q.length < 1) return [];
  const scored: { score: number; hit: Hit }[] = [];
  for (const [ticker, name, cik, exchange, slug] of rows) {
    const t = ticker.toLowerCase();
    const n = name.toLowerCase();
    let score = 0;
    if (t === q) score = 100;
    else if (t.startsWith(q)) score = 80;
    else if (n.startsWith(q)) score = 60;
    else if (n.split(/[^a-z0-9]+/).some((word) => word.startsWith(q))) score = 50;
    else if (q.length >= 2 && n.includes(q)) score = 30;
    else if (q.length >= 3 && String(cik).includes(q)) score = 20;
    else continue;
    scored.push({
      score,
      hit: {
        href: href(`edgar/${slug}/`),
        title: `${ticker}  ${name}`,
        meta: [exchange, `CIK ${cik}`].filter(Boolean).join(" · "),
        kind: "Issuer",
      },
    });
  }
  scored.sort((a, b) => b.score - a.score || a.hit.title.localeCompare(b.hit.title));
  return scored.slice(0, 8).map((row) => row.hit);
}

function safeExcerpt(input: string): string {
  const escaped = input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.replace(/&lt;(\/)?mark&gt;/g, "<$1mark>");
}

function resultUrl(url: string): string {
  let path = url;
  try {
    if (url.startsWith("http://") || url.startsWith("https://")) path = new URL(url).pathname + new URL(url).hash;
  } catch {
    path = url;
  }
  path = path.replace(/index\.html$/, "");
  if (!path.startsWith("/")) path = `/${path}`;
  const base = import.meta.env.BASE_URL;
  if (path.startsWith(base)) return path;
  return `${base.replace(/\/$/, "")}${path}`;
}

type PagefindModule = {
  options?: (opts: { bundlePath: string }) => void;
  search: (query: string) => Promise<{ results: { data: () => Promise<{ url: string; excerpt: string; meta?: { title?: string } }> }[] }>;
};

let pagefindPromise: Promise<PagefindModule | null> | null = null;

function loadPagefind(): Promise<PagefindModule | null> {
  if (!pagefindPromise) {
    const bundle = `${import.meta.env.BASE_URL}pagefind/`;
    pagefindPromise = import(/* @vite-ignore */ `${bundle}pagefind.js`)
      .then((mod) => {
        const pagefind = (mod.default ?? mod) as PagefindModule;
        pagefind.options?.({ bundlePath: bundle });
        return pagefind;
      })
      .catch(() => null);
  }
  return pagefindPromise;
}

function renderResults(container: HTMLElement, hits: Hit[], empty: string): void {
  if (!hits.length) {
    container.innerHTML = `<p class="hit-meta" style="padding:0.55rem 0.65rem">${empty}</p>`;
    container.hidden = false;
    return;
  }
  let last = "";
  const html: string[] = [];
  hits.forEach((hit, index) => {
    if (hit.kind !== last) {
      html.push(`<div class="k">${hit.kind}</div>`);
      last = hit.kind;
    }
    html.push(
      `<a role="option" id="hit-${index}" href="${hit.href}"><span class="hit-title">${escapeText(hit.title)}</span>` +
        (hit.meta ? `<span class="hit-meta"> ${escapeText(hit.meta)}</span>` : "") +
        (hit.excerpt ? `<span class="excerpt">${safeExcerpt(hit.excerpt)}</span>` : "") +
        `</a>`,
    );
  });
  container.innerHTML = html.join("");
  container.hidden = false;
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function bindListbox(input: HTMLInputElement, container: HTMLElement): void {
  let active = -1;
  const move = (delta: number) => {
    const options = [...container.querySelectorAll<HTMLAnchorElement>("a[role='option']")];
    if (!options.length) return;
    active = (active + delta + options.length) % options.length;
    options.forEach((option, index) => option.setAttribute("aria-selected", index === active ? "true" : "false"));
    options[active]?.scrollIntoView({ block: "nearest" });
  };
  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Enter" && active >= 0) {
      const options = [...container.querySelectorAll<HTMLAnchorElement>("a[role='option']")];
      if (options[active]) {
        event.preventDefault();
        window.location.href = options[active].href;
      }
    } else if (event.key === "Escape") {
      container.hidden = true;
      active = -1;
    }
  });
  input.addEventListener("input", () => {
    active = -1;
  });
}

function initSiteSearch(): void {
  const input = document.querySelector<HTMLInputElement>("#q");
  const box = document.querySelector<HTMLElement>("#site-results");
  if (!input || !box) return;
  bindListbox(input, box);
  let token = 0;
  let timer = 0;
  const run = async () => {
    const query = input.value.trim();
    const current = ++token;
    if (query.length < 2) {
      box.hidden = true;
      box.innerHTML = "";
      return;
    }
    const [issuerRows, pagefind] = await Promise.all([
      loadIssuers().catch(() => [] as Issuer[]),
      loadPagefind(),
    ]);
    if (current !== token) return;
    const hits = matchIssuers(issuerRows, query).map((hit) => ({ ...hit, kind: "Issuers" }));
    if (pagefind) {
      const found = await pagefind.search(query);
      if (current !== token) return;
      const slice = found.results.slice(0, 6);
      const pages = await Promise.all(slice.map((result) => result.data()));
      for (const page of pages) {
        const url = resultUrl(page.url);
        if (url.includes("/edgar/cik/")) continue;
        if (hits.some((hit) => hit.href === url)) continue;
        hits.push({
          href: url,
          title: page.meta?.title || url,
          meta: "",
          excerpt: page.excerpt,
          kind: "On this site",
        });
      }
    }
    renderResults(
      box,
      hits,
      pagefind ? "No matches." : "No issuer matches. The section index is in the production build.",
    );
  };
  input.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(run, 90);
  });
  input.addEventListener("focus", () => {
    if (input.value.trim().length >= 2) void run();
  });
  input.form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const selected = box.querySelector<HTMLAnchorElement>("a[aria-selected='true']")
      || box.querySelector<HTMLAnchorElement>("a[role='option']");
    if (selected) window.location.href = selected.href;
  });
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Node)) return;
    if (!input.contains(event.target) && !box.contains(event.target)) box.hidden = true;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
    event.preventDefault();
    input.focus();
    input.select();
  });
}

function initIssuerSearch(): void {
  const form = document.querySelector<HTMLFormElement>("#issuer-search");
  const input = document.querySelector<HTMLInputElement>("#issuer");
  const box = document.querySelector<HTMLElement>("#issuer-results");
  if (!form || !input || !box) return;
  bindListbox(input, box);
  let rows: Issuer[] = [];
  let ready = false;
  const paint = () => {
    const query = input.value.trim();
    if (!ready || query.length < 1) {
      box.hidden = true;
      return;
    }
    renderResults(box, matchIssuers(rows, query), "No issuer matches. Submit to open EDGAR’s own search.");
  };
  input.addEventListener("focus", () => {
    if (ready) return;
    loadIssuers()
      .then((data) => {
        rows = data;
        ready = true;
        paint();
      })
      .catch(() => {
        box.hidden = false;
        box.innerHTML = `<p class="hit-meta" style="padding:0.55rem 0.65rem">Issuer index failed to load. Submit to search on EDGAR.</p>`;
      });
  });
  input.addEventListener("input", paint);
  form.addEventListener("submit", (event) => {
    const query = input.value.trim().toLowerCase();
    const exact = rows.find((row) => row[0].toLowerCase() === query || row[4] === query);
    if (exact) {
      event.preventDefault();
      window.location.href = href(`edgar/${exact[4]}/`);
      return;
    }
    const selected = box.querySelector<HTMLAnchorElement>("a[aria-selected='true']");
    if (selected) {
      event.preventDefault();
      window.location.href = selected.href;
    }
  });
}

function initTheme(): void {
  const button = document.querySelector<HTMLButtonElement>("#theme");
  if (!button) return;
  const sync = () => {
    const dark = document.documentElement.dataset.theme === "dark";
    button.textContent = dark ? "Light" : "Dark";
    button.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  };
  sync();
  button.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode */
    }
    sync();
  });
}

function initCopy(): void {
  document.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>("[data-copy]");
    if (!button) return;
    const text = button.dataset.copy || "";
    const previous = button.textContent;
    navigator.clipboard?.writeText(text).then(
      () => {
        button.textContent = "Copied";
        window.setTimeout(() => {
          button.textContent = previous;
        }, 1200);
      },
      () => {},
    );
  });
}

function initActFilter(): void {
  const input = document.querySelector<HTMLInputElement>("[data-act-filter]");
  if (!input) return;
  const items = [...document.querySelectorAll<HTMLElement>("[data-filter-item]")];
  const count = document.querySelector("[data-filter-count]");
  const apply = () => {
    const query = input.value.trim().toLowerCase();
    let shown = 0;
    for (const item of items) {
      const hay = item.dataset.filterText || "";
      const ok = !query || hay.includes(query);
      item.hidden = !ok;
      if (ok && item.getClientRects().length > 0) shown += 1;
    }
    if (count) count.textContent = query ? `${shown} match${shown === 1 ? "" : "es"}` : "";
    document.querySelectorAll<HTMLElement>("[data-filter-group]").forEach((group) => {
      const visible = [...group.querySelectorAll<HTMLElement>("[data-filter-item]")].some((el) => !el.hidden);
      group.hidden = !visible;
    });
  };
  input.addEventListener("input", apply);
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function initFilings(): void {
  const root = document.querySelector<HTMLElement>("[data-filings]");
  if (!root) return;
  const rows = [...root.querySelectorAll<HTMLElement>("[data-filing]")];
  const chips = [...document.querySelectorAll<HTMLButtonElement>("[data-chip]")];
  const from = document.querySelector<HTMLInputElement>("[data-from]");
  const to = document.querySelector<HTMLInputElement>("[data-to]");
  const shown = document.querySelector("[data-shown]");
  const empty = document.querySelector<HTMLElement>("[data-filing-empty]");
  const live = document.querySelector<HTMLAnchorElement>("[data-live]");
  const cik = root.dataset.cik || "";
  let group = "all";

  const apply = () => {
    const start = from?.value || "";
    const end = to?.value || "";
    let count = 0;
    for (const row of rows) {
      const okGroup = group === "all" || row.dataset.group === group;
      const filed = row.dataset.filed || "";
      const okDate = (!start || filed >= start) && (!end || filed <= end);
      const ok = okGroup && okDate;
      row.hidden = !ok;
      if (ok) count += 1;
    }
    if (shown) shown.textContent = String(count);
    if (empty) empty.hidden = count !== 0;
    if (live) live.href = edgarLive(cik, group, start, end);
  };

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      group = chip.dataset.chip || "all";
      chips.forEach((item) => item.setAttribute("aria-pressed", item === chip ? "true" : "false"));
      apply();
    });
  });
  from?.addEventListener("change", apply);
  to?.addEventListener("change", apply);
  document.querySelectorAll<HTMLButtonElement>("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      const years = Number(button.dataset.preset || "0");
      if (!from || !to) return;
      if (!years) {
        from.value = "";
        to.value = "";
      } else {
        const end = new Date();
        const start = new Date(end);
        start.setFullYear(end.getFullYear() - years);
        from.value = iso(start);
        to.value = iso(end);
      }
      apply();
    });
  });
}

function edgarLive(cik: string, group: string, start: string, end: string): string {
  const params = new URLSearchParams();
  params.set("category", "custom");
  params.set("ciks", cik);
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

initTheme();
initCopy();
initSiteSearch();
initIssuerSearch();
initActFilter();
initFilings();
