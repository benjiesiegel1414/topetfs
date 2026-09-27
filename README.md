# TopETFs.com

ETF research hub for the Dividend Empire network. Static site on GitHub Pages.

- `content/articles/*.html` : stories. Each starts with a `<!--meta {...} -->` JSON block.
  Tokens inside the body are filled from the data at build time and kept live in the browser:
  - `{{live:JEPI:yield}}` live number (fields: yield, er, aum, tr, decay; formats: pct, pct2, signed, aum, usd)
  - `{{tkr:JEPI}}` ticker link to the ETF profile
  - `{{calc:usd:10000*JEPI.yield/100}}` computed value
  - `{{count:pro}}` number of funds in a list
- `data/*.csv` : snapshots of the PRO, WeeklyETFs and GrowthETFs sheets (refreshed daily by the workflow)
- `assets/` : CSS and the front-end script (live data, charts, calculators, search)
- `scripts/build.mjs` : builds every page, the sitemap and RSS into the repo root

Build locally: `node scripts/build.mjs`

The workflow in `.github/workflows/build.yml` pulls fresh data every morning, rebuilds and commits.
Set `GA_ID` at the top of `scripts/build.mjs` once a GA4 property exists.
