# Securities Law Deskbook

A static research desk for public-company and capital-markets lawyers. The Securities Act half covers offerings. The Exchange Act half covers reporting, proxies, insiders, and deals. Under those tasks sit the statute text, the related 17 C.F.R. rules, short form guides, and an EDGAR issuer search. Foreign private issuers are included throughout.

The site is built to be published at [https://cs-514.github.io/sld/](https://cs-514.github.io/sld/). Every link, asset, and search index is prefixed with `/sld/`. The name in the header is `SITE_NAME` in `src/lib/site.ts`.

## What you can do

- Look up an Act section and its U.S. Code cite. [Securities Act § 5](https://cs-514.github.io/sld/33-act/section-5/) is [15 U.S.C. § 77e](https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title15-section77e&num=0&edition=prelim). [Exchange Act § 10(b)](https://cs-514.github.io/sld/34-act/section-10/#b) is a subsection of § 10, not a separate section. § 10A is. The section page lists the implementing rules and forms.
- Read a rule on its own page. [Rule 10b-5](https://cs-514.github.io/sld/rules/17-cfr-240/rule-10b-5/) and [Rule 144](https://cs-514.github.io/sld/rules/17-cfr-230/rule-144/) keep an anchor on every paragraph. [Item 402](https://cs-514.github.io/sld/rules/17-cfr-229/item-402/) is split by paragraph.
- Open a form guide, for example [Form 8-K](https://cs-514.github.io/sld/forms/8-k/) or [Form S-8](https://cs-514.github.io/sld/forms/s-8/). The guide links the SEC instruction PDF. It does not copy it.
- Search issuers by name or ticker and open a snapshot of recent filings, with direct document links and a one-click jump to the live EDGAR index.

Statute text is rendered from the OLRC USLM XML, and rule text from the eCFR versioner. Both are United States government work. The site does not copy commercial treatises or SEC form PDFs.

## Stack

[Astro](https://astro.build/) writes plain HTML. The client ships one small script (theme, search, filters) and, only after you focus the search box, [Pagefind](https://pagefind.app/). No React, no external fonts, no trackers. System fonts only.

## URLs

Stable section permalinks:

| What | Path |
| --- | --- |
| Securities Act | `/securities-act/` |
| Registered offerings | `/securities-act/registered-offerings/` |
| Securities Act § 5 | `/securities-act/section-5/` |
| Securities Act § 5(b) | `/securities-act/section-5/#b` |
| Exchange Act | `/exchange-act/` |
| Current reporting | `/exchange-act/current-reporting/` |
| Exchange Act § 10(b) | `/exchange-act/section-10/#b` |
| Rule 10b-5 | `/exchange-act/rules/17-cfr-240/rule-10b-5/` |
| Rule 144 | `/securities-act/rules/17-cfr-230/rule-144/` |
| Regulation S-K Item 402 | `/exchange-act/rules/17-cfr-229/item-402/` |
| Forms | `/forms/` |
| Form 8-K | `/forms/8-k/` |
| Issuer | `/edgar/aapl/` |

The old paths `/33-act/…`, `/34-act/…`, and `/rules/…` redirect to these.

On GitHub Pages those paths are under `https://cs-514.github.io/sld`.

Still reserved. Section records keep `crossLinks` arrays for `releases`, `interpretations`, and `amendingActs`.

| Later step | Path |
| --- | --- |
| Release | `/releases/33-11234/`, `/releases/34-.../` |
| Corporation Finance Interpretation (CFI) | `/cdi/securities-act-rules/`, `/cdi/exchange-act-sections/` |
| Amending act | `/history/sarbanes-oxley/`, `/history/jobs-act/`, `/history/dodd-frank/`, `/history/fast-act/` |

## Data

### Statutes

`scripts/build_statutes.py` downloads the current Title 15 USLM zip from [uscode.house.gov/download.html](https://uscode.house.gov/download.html) and writes:

- `src/data/statutes/33-act.json`
- `src/data/statutes/34-act.json`
- `src/data/statutes/provenance.json` (release point and SHA-256)

Act section numbers are the first `ch. 38` or `ch. 404` citation in the OLRC source credit. That is the crosswalk lawyers use. A later citation in the same credit is an amendment, not a second section number. The script checks a fixed set of mappings (Securities Act §§ 4, 4A, 5, 11; Exchange Act §§ 10, 10A, 10D, 15D, 30A) and exits if they drift. Title III of the 1933 Act chapter is classified and not published.

```bash
python3 -m pip install lxml
npm run data:statutes
```

The generated JSON is committed, so a normal site build does not need Python.

### Rules

`scripts/build_rules.py` reads the eCFR versioner full XML for 17 C.F.R. Parts 210, 227, 229, 230, 232, 239, 240, 243, 244, 245, and 249 and writes `src/data/rules/`. Paragraphs are anchored (`#a`, `#a-1`, `#b-2-i`). A Regulation S-K or S-X item over 80 KB, and any other section over 140 KB, is split at the top-level paragraph. Cites to other rules and to Act sections become links. The script also writes `statute-links.json`, which the statute pages merge in as “Implementing rules and forms.”

```bash
python3 -m pip install lxml
npm run data:rules
```

`python3 scripts/build_rules.py` without `--download` rebuilds from `data/cache/ecfr/` (gitignored). The Monday workflow refreshes those parts and commits the JSON. `--only 243,244` refreshes a subset. A normal push does not.

### EDGAR

`data.sec.gov` does not send CORS headers reliably, and a browser cannot set the User-Agent the SEC’s [fair-access policy](https://www.sec.gov/os/webmaster-faq#developers) requires (requests with no User-Agent are rejected). The workable static approach:

1. A build job downloads `company_tickers.json`, `company_tickers_exchange.json`, and each issuer’s submissions JSON, at about 8 requests per second. Every SEC request uses the User-Agent in `scripts/user-agent.mjs`: `Securities Law Deskbook research portal (contact: GitHub cs-514)`. Change that file to change the string.
2. It keeps a capped set of recent filings per form family (10-K/20-F/40-F, 10-Q, 8-K/6-K, S-1, S-3, proxy, 13D/G, Forms 3/4/5, other registration statements, and a handful of everything else). The source list is the SEC “recent” array, roughly the latest 1,000 filings. If that array has no annual report, the job reads one older submissions shard.
3. The site serves that snapshot from the same origin. Typeahead uses `public/data/issuers.json`. Company pages are prerendered from `src/data/edgar/companies.json`.
4. Every company page also links to the live EDGAR issuer page, the classic company index, and EDGAR full-text search with the current form and date filter filled in. Use those when you need something the cap dropped, or a filing newer than the snapshot.

```bash
npm run data:edgar
```

The job is resumable (`data/cache/edgar-filings.jsonl`, gitignored). Filings are stored as short arrays so the snapshot stays a normal git file.

## Develop

```bash
npm install
npm run build
npm run preview
```

The preview is at [http://127.0.0.1:4477/sld/](http://127.0.0.1:4477/sld/). `npm run dev` is the same port, but Pagefind exists only after `npm run build`.

`npm run verify` checks the Act-to-U.S.C. map, the AAPL / MSFT / JPM snapshots, and, if `dist/` exists, that built links stay under `/sld/`. `npm run verify:links` also requests a sample of OLRC, govinfo, and LII URLs.

## Deploy to GitHub Pages

The repository this site is meant to live in is `cs-514/sld`.

1. Push the default branch.
2. In the repo, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**.
3. The workflow `.github/workflows/pages.yml` builds `dist/` and deploys it. GitHub serves a project site at `https://cs-514.github.io/sld/`. The files inside the artifact are not nested in an `sld/` folder; the `/sld` prefix is in the HTML, from `base: "/sld"` in `astro.config.mjs`.
4. If the repository name ever changes, change `base` and `site` in `astro.config.mjs` to match, or every asset 404s.

The same workflow refreshes the EDGAR ticker list and filings snapshot, and the six C.F.R. parts, every Monday at 11:30 UTC, then rebuilds and redeploys Pages. Run it by hand and check “Refresh the EDGAR snapshot” or “Refresh 17 C.F.R.” to do either immediately. SEC requests send the User-Agent in `scripts/user-agent.mjs`. A scheduled run commits the new snapshot and the rule JSON, then deploys the site it just built. The default `GITHUB_TOKEN` must be allowed to write contents (Settings → Actions → General → Workflow permissions).

Statute refreshes are deliberate. Run `npm run data:statutes`, read the mapping check, and commit the JSON.

## Layout

- Sticky search. Press `/` to focus it. Issuers resolve from the local ticker file; sections resolve from the Pagefind index.
- Act indexes toggle between Act order and U.S. Code order without JavaScript.
- Light and dark follow the system until you toggle them.
- On a phone, Home, the Acts, Rules, Forms, and EDGAR sit in a bottom bar. Filing filters wrap; they are not a horizontal scroller you have to chase.
