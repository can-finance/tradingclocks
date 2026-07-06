# Exchange Holiday Calendar Sources

Official (not third-party aggregator) sources for each exchange's trading-holiday
calendar, used to populate `public/holidays.json`. Recorded so future updates
don't require re-searching from scratch.

**Last researched:** 2026-07-05 (checking 2027 availability).

General pattern: most exchanges publish next year's calendar in **Q4 of the prior
year** (roughly Oct–Dec). If a status below says "not yet published," re-check
after Q4 2026.

## Americas

| Market | Official source | 2027 status |
|---|---|---|
| NYSE / Nasdaq (`nyse`, alias `nasdaq`) | [nyse.com/markets/hours-calendars](https://www.nyse.com/markets/hours-calendars) — corroborated by ICE's press release "NYSE Group Announces 2026, 2027 and 2028 Holiday and Early Closings Calendar" | **Published.** Already in `holidays.json`. |
| TSX (`tsx`) | [tsx.com/en/trading/calendars-and-trading-hours/calendar](https://www.tsx.com/en/trading/calendars-and-trading-hours/calendar) (note: `/holiday-schedule` path 404s — use `/calendar`) | Not yet — site shows only through 2026. |

## Europe

| Market | Official source | 2027 status |
|---|---|---|
| LSE (`lse`) | [londonstockexchange.com/equities-trading/business-days](https://www.londonstockexchange.com/equities-trading/business-days) | Unconfirmed — page is JS-rendered, resists automated fetch. Search snippets suggest a 2027 list circulates but isn't verified against the live page. Needs a manual/browser check. |
| Euronext Paris/Amsterdam/Brussels/Dublin (`euronext-paris`, `euronext-amsterdam`, `euronext-brussels`, `euronext-dublin`) | [euronext.com/en/trading/trading-hours-holidays](https://www.euronext.com/en/trading/trading-hours-holidays) (all four markets share one circular) | Not yet — confirmed via direct fetch, page covers only 2024–2026. The 2026 circular itself wasn't issued until Nov 2025, so 2027 likely appears ~Nov 2026. |
| Oslo Børs (`oslo-bors`) | Same Euronext page as above (Oslo joined Euronext) | Not yet — same 2024–2026 coverage. |
| Deutsche Börse / XETRA (`xetra`) | [cashmarket.deutsche-boerse.com/cash-en/trading/trading-calendar-and-trading-hours](https://www.cashmarket.deutsche-boerse.com/cash-en/trading/trading-calendar-and-trading-hours) | **Published** (table runs 2026–2032, though the site caveats it's "for information purposes only" for future years). Already in `holidays.json`. |
| SIX Swiss Exchange (`six`) | Landing page: [six-group.com/.../trading-currency-holiday-calendar.html](https://www.six-group.com/en/market-data/news-tools/trading-currency-holiday-calendar.html); PDF: `https://www.six-group.com/dam/download/the-swiss-stock-exchange/trading/trading-provisions/regulation/trading-guides/trading-calendar-2027.pdf` | **Published** — but note the landing page still only links the 2026 PDF; the 2027 PDF exists at a predictable URL pattern (swap the year) and isn't linked yet. Already in `holidays.json`. |
| Bolsa de Madrid / BME (`bme`) | [bolsasymercados.es/en/bme-exchange/trading/trading-calendar.html](https://www.bolsasymercados.es/en/bme-exchange/trading/trading-calendar.html) (still on the BME/SIX-Group domain, not migrated to six-group.com) | Not yet — only 2026 shown. |
| Borsa Italiana (`borsa-italiana`) | [borsaitaliana.it/borsaitaliana/calendario-e-orari-di-negoziazione/calendario-borsa-orari-di-negoziazione.en.htm](https://www.borsaitaliana.it/borsaitaliana/calendario-e-orari-di-negoziazione/calendario-borsa-orari-di-negoziazione.en.htm) | Not yet — only 2025/2026 PDFs. |
| Wiener Börse (`wiener-borse`) | [wienerborse.at/en/trading/trading-information/trading-calendar](https://www.wienerborse.at/en/trading/trading-information/trading-calendar/) | Not yet — only 2026 PDF (`stock-exchange-holidays-2026-en.pdf`). |
| Warsaw Stock Exchange / GPW (`gpw`) | Management Board resolutions, linked from [gpw.pl/komunikaty-i-uchwaly-gpw](https://www.gpw.pl/komunikaty-i-uchwaly-gpw) — 2027 calendar is Resolution No. 754/2025 (`gpw.pl/pub/GPW/uchwaly/2025/754_2025.pdf`) | **Published.** Already in `holidays.json`. |
| Nasdaq Stockholm/Copenhagen/Helsinki (`nasdaq-nordic-stockholm`, `nasdaq-nordic-copenhagen`, `nasdaq-nordic-helsinki`) | [nasdaq.com/european-market-activity/trading-hours](https://www.nasdaq.com/european-market-activity/trading-hours) (old `nasdaqomxnordic.com/tradinghours` now 301-redirects here; the old domain's static PDF paths also now redirect into nasdaq.com rather than serving the legacy file, so there's no bypass via the retired domain) | **Unconfirmed — not a data gap, a tooling gap.** The entire `nasdaq.com` host is unreachable via automated fetch tools (10/10 URLs failed with timeout/ECONNRESET, including the bare root domain with no path — ruling out a page-specific or JS-rendering cause; this is host-level bot/WAF blocking). A search snippet referenced a "Nordic Equity Derivatives Trading Calendar 2026–2028" on this page, which would mean 2027 *is* published — but no snippet contained actual dates, so this is unverified. **Needs a real browser (e.g. Chrome MCP tools) rather than a fetch-based tool to check.** |

## Asia-Pacific

| Market | Official source | 2027 status |
|---|---|---|
| TWSE (`twse`) | [twse.com.tw/en/trading/holiday.html](https://www.twse.com.tw/en/trading/holiday.html), backed by `twse.com.tw/rwd/en/holidaySchedule/holidaySchedule?response=json&year=YYYY` | Not yet — the live JSON API returns the 2026 dataset regardless of the year param queried. |
| KRX (`krx`) | [global.krx.co.kr/contents/GLB/05/0501/0501110000/GLB0501110000.jsp](https://global.krx.co.kr/contents/GLB/05/0501/0501110000/GLB0501110000.jsp) | Not yet — page's year selector tops out at 2026; official KRX/KOSDAQ desk-calendar PDF has a blank 2027 grid (weekends shaded only, no holidays marked). |
| Tokyo Stock Exchange / JPX (`tse`) | [jpx.co.jp/english/corporate/about-jpx/calendar/index.html](https://www.jpx.co.jp/english/corporate/about-jpx/calendar/index.html) (blocks plain HTTP fetch with 403 — needed a text-extraction proxy or browser to read) | **Published**, with caveat — the page already lists 2027 non-trading days; movable dates (Vernal/Autumnal Equinox, Respect for the Aged Day) were cross-verified against independent sources and JPX's own BCP-test press release. Already added to `holidays.json`, but since the source had to be read via proxy rather than a direct render, spot-check the live page if precision matters. |
| Hong Kong Exchange (`hkex`) | Circulars under `hkex.com.hk/-/media/HKEX-Market/Services/Circulars-and-Notices/Participant-and-Members-Circulars/SEHK/<year>/` (2026 schedule: `ce_SEHK_CT_075_2025.pdf`) | Not yet — no `.../SEHK/2026/` circular with 2027 dates found. HKEX typically follows the Hong Kong government's general holiday gazette (2027 dates already gazetted at [gov.hk/en/about/abouthk/holiday/2027.htm](https://www.gov.hk/en/about/abouthk/holiday/2027.htm)), but hasn't published its own derived trading calendar yet. |
| SGX (`sgx`) | [sgx.com/bcp/annual-market-exercise-calendar](https://www.sgx.com/bcp/annual-market-exercise-calendar); derivatives circulars ("DTAM") under `api2.sgx.com` | Not yet — most recent derivatives circular (DTAM 87 of 2024) covers 2025; publishes roughly one year ahead. |
| ASX (`asx`) | Cash equities: [asx.com.au/markets/market-resources/trading-hours-calendar/cash-market-trading-hours/trading-calendar](https://www.asx.com.au/markets/market-resources/trading-hours-calendar/cash-market-trading-hours/trading-calendar) | Not yet for cash equities (shows only 2026). Note: ASX's separate **ASX 24 futures** calendar already has a [2027 PDF](https://www.asx.com.au/content/dam/asx/markets/market-resources/t24-trading-calendars/T24-trading-calendar2027.pdf) — not relevant to this app since it's derivatives, not the cash market. |
| NZX (`nzx`) | Announcement memos, e.g. [nzx.com/announcements/463713](https://www.nzx.com/announcements/463713) ("NZX Market Holidays – 2025/2027") | **Partially published** — despite the title, only the New Year period is out this far: 2026-12-31 (abbreviated trading), 2027-01-01, 2027-01-04 (observed). No other 2027 holidays (Waitangi Day, Easter, ANZAC Day, Matariki, etc.) are out yet. Both confirmed 2027 dates are already in `holidays.json`. |

## Notes

- "Not yet published" doesn't mean the date doesn't exist anywhere — third-party
  aggregator sites (calendarlabs.com, mrtopstep.com, etc.) sometimes list
  provisional dates ahead of the official source. Those were deliberately
  excluded from `holidays.json` per this research; only re-add once the
  exchange's own site confirms them.
- JS-rendered official sites (LSE, Nasdaq Nordic, KRX) resisted plain HTTP
  fetch tools — if re-checking these, use a real browser rather than a
  fetch/curl-style tool.
- JPX (`jpx.co.jp`) and HKEX (`hkex.com.hk`) block plain fetches with HTTP 403;
  a text-extraction proxy or browser was needed.
