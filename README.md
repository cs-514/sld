# Pinpoint

A static research desk for U.S. capital-markets lawyers. This is step 1: the statute hierarchy for the Securities Act of 1933 and the Securities Exchange Act of 1934, the Trust Indenture Act (so Title III of the same chapter is not mislabeled), and an EDGAR issuer search.

The site is built to be published at [https://cs-514.github.io/sld/](https://cs-514.github.io/sld/). Every link, asset, and search index is prefixed with `/sld/`.

## What you can do

- Look up an Act section and its U.S. Code cite. [Securities Act § 5](https://cs-514.github.io/sld/33-act/section-5/) is [15 U.S.C. § 77e](https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title15-section77e&num=0&edition=prelim). [Exchange Act § 10(b)](https://cs-514.github.io/sld/34-act/section-10/#b) is a subsection of § 10, not a separate section. § 10A is.
- Read the operative text on the section page, with an anchor on every subdivision, and open the same text at the House Office of the Law Revision Counsel, govinfo, or Cornell LII.
- Search issuers by name or ticker and open a snapshot of recent filings, with direct document links and a one-click jump to the live EDGAR index.

Operative text is rendered from the OLRC USLM XML (United States government work). Source credits and amendment notes are collapsed under the text. The site does not copy commercial treatises.

## Stack

[Astro](https://astro.build/) writes plain HTML. The client ships one small script (theme, search, filters) and, only after you focus the search box, [Pagefind](https://pagefind.app/). No React, no external fonts, no trackers. System fonts only.

## URLs

Stable section permalinks:

| What | Path |
| --- | --- |
| Securities Act | `/33-act/` |
| Securities Act § 5 | `/33-act/section-5/` |
| Securities Act § 5(b) | `/33-act/section-5/#b` |
| Securities Act § 4A | `/33-act/section-4a/` |
| Schedules A and B | `/33-act/schedule-a/` |
| Securities Act Title II § 201 | `/33-act/section-201/` |
| Exchange Act § 10 | `/34-act/section-10/` |
| Exchange Act § 10(b) | `/34-act/section-10/#b` |
| Exchange Act § 10A | `/34-act/section-10a/` |
| A chapter 2B provision that is not an Act section | `/34-act/usc-78d-6/` |
| Trust Indenture Act § 304 | `/tia/section-304/` |
| Issuer | `/edgar/aapl/` |
| Issuer by CIK | `/edgar/cik/0000320193/` |

On GitHub Pages those paths are under `https://cs-514.github.io/sld`.

Reserved for later steps. The section JSON already has empty `crossLinks` arrays (`rules`, `forms`, `releases`, `interpretations`, `amendingActs`) so these can be filled without moving the section URLs.

| Later step | Path |
| --- | --- |
| Rule, e.g. Rule 144 and Rule 10b-5 | `/rules/17-cfr-230/rule-144/`, `/rules/17-cfr-240/rule-10b-5/` |
| Reg S-K item | `/rules/17-cfr-229/item-303/` |
| Reg S-X | `/rules/17-cfr-210/` |
| Form | `/forms/10-k/`, `/forms/s-1/` |
| Release | `/releases/33-11234/`, `/releases/34-.../` |
| C&DI | `/cdi/securities-act-rules/`, `/cdi/exchange-act-sections/` |
| Amending act | `/history/sarbanes-oxley/`, `/history/jobs-act/`, `/history/dodd-frank/`, `/history/fast-act/` |

## Data

### Statutes

`scripts/build_statutes.py` downloads the current Title 15 USLM zip from [uscode.house.gov/download.html](https://uscode.house.gov/download.html) and writes:

- `src/data/statutes/33-act.json`
- `src/data/statutes/34-act.json`
- `src/data/statutes/tia.json`
- `src/data/statutes/provenance.json` (release point and SHA-256)

Act section numbers are the first `ch. 38` or `ch. 404` citation in the OLRC source credit. That is the crosswalk lawyers use. A later citation in the same credit is an amendment, not a second section number. The script checks a fixed set of mappings (Securities Act §§ 4, 4A, 5, 11; Exchange Act §§ 10, 10A, 10D, 15D, 30A; Trust Indenture Act § 301) and exits if they drift.

```bash
python3 -m pip install lxml
npm run data:statutes
```

The generated JSON is committed, so a normal site build does not need Python.

### EDGAR

`data.sec.gov` does not send CORS headers reliably, and a browser cannot set the User-Agent the SEC’s [fair-access policy](https://www.sec.gov/os/webmaster-faq#developers) requires (requests with no User-Agent are rejected). The workable static approach:

1. A build job downloads `company_tickers.json`, `company_tickers_exchange.json`, and each issuer’s submissions JSON, at about 8 requests per second. Every SEC request uses the User-Agent in `scripts/user-agent.mjs`: `Pinpoint securities research portal (contact: GitHub cs-514)`. Change that file to change the string.
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

The same workflow refreshes the EDGAR ticker list and filings snapshot every Monday at 11:30 UTC, then rebuilds and redeploys Pages. Run it by hand with “Refresh the EDGAR snapshot” checked to do the same immediately. Those requests send the User-Agent in `scripts/user-agent.mjs`. A scheduled run commits the new snapshot and deploys the site it just built. The default `GITHUB_TOKEN` must be allowed to write contents (Settings → Actions → General → Workflow permissions).

Statute refreshes are deliberate. Run `npm run data:statutes`, read the mapping check, and commit the JSON.

## Layout

- Sticky search. Press `/` to focus it. Issuers resolve from the local ticker file; sections resolve from the Pagefind index.
- Act indexes toggle between Act order and U.S. Code order without JavaScript.
- Light and dark follow the system until you toggle them.
- On a phone, the four sections sit in a bottom bar so they can be reached with one hand. Filing filters wrap; they are not a horizontal scroller you have to chase.
