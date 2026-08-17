# Exchange Holiday Calendar Sources

Official (not third-party aggregator) sources for each exchange's trading-holiday
calendar, used to populate `public/holidays.json`. Recorded so future updates
don't require re-searching from scratch.

**Last researched:** 2026-08-17 (checking 2027 availability).

General pattern: most exchanges publish next year's calendar in **Q4 of the prior
year** (roughly Oct–Dec). If a status below says "not yet published," re-check
after Q4 2026.

## Americas

| Market | Official source | 2027 status |
|---|---|---|
| NYSE (`nyse`) | [nyse.com/markets/hours-calendars](https://www.nyse.com/markets/hours-calendars) — corroborated by ICE's press release "NYSE Group Announces 2026, 2027 and 2028 Holiday and Early Closings Calendar" | **Published.** Already in `holidays.json`. (US Nasdaq follows the same calendar but has no market entry in this app; a former unused `"nasdaq"` alias was removed 2026-08-17.) |
| TSX (`tsx`) | [tsx.com/en/trading/calendars-and-trading-hours/calendar](https://www.tsx.com/en/trading/calendars-and-trading-hours/calendar) (note: `/holiday-schedule` path 404s — use `/calendar`) | Not yet — site shows only through 2026. |

## Europe

| Market | Official source | 2027 status |
|---|---|---|
| LSE (`lse`) | [londonstockexchange.com/equities-trading/business-days](https://www.londonstockexchange.com/equities-trading/business-days) | **Published** — resolved 2026-08-17 by loading the page in a real browser (it is JS-rendered, which is why fetch tools saw nothing). The table runs through 2029. All ten 2027 entries are in `holidays.json`, including the two half days (Dec 24 and Dec 31, "closing process commences from 12:30 London time"). |
| Euronext Paris/Amsterdam/Brussels/Dublin (`euronext-paris`, `euronext-amsterdam`, `euronext-brussels`, `euronext-dublin`) | [euronext.com/en/trading/trading-hours-holidays](https://www.euronext.com/en/trading/trading-hours-holidays) (all four markets share one circular) | Not yet — confirmed via direct fetch, page covers only 2024–2026. The 2026 circular itself wasn't issued until Nov 2025, so 2027 likely appears ~Nov 2026. |
| Oslo Børs (`oslo-bors`) | Same Euronext page as above (Oslo joined Euronext) | Not yet — same 2024–2026 coverage. |
| Deutsche Börse / XETRA (`xetra`) | [cashmarket.deutsche-boerse.com/cash-en/trading/trading-calendar-and-trading-hours](https://www.cashmarket.deutsche-boerse.com/cash-en/trading/trading-calendar-and-trading-hours) | **Published** (table runs 2026–2032, though the site caveats it's "for information purposes only" for future years). Already in `holidays.json`. |
| SIX Swiss Exchange (`six`) | Landing page: [six-group.com/.../trading-currency-holiday-calendar.html](https://www.six-group.com/en/market-data/news-tools/trading-currency-holiday-calendar.html); PDF: `https://www.six-group.com/dam/download/the-swiss-stock-exchange/trading/trading-provisions/regulation/trading-guides/trading-calendar-2027.pdf` | **Published** — but note the landing page still only links the 2026 PDF; the 2027 PDF exists at a predictable URL pattern (swap the year) and isn't linked yet. Already in `holidays.json`. |
| Bolsa de Madrid / BME (`bme`) | [bolsasymercados.es/en/bme-exchange/trading/trading-calendar.html](https://www.bolsasymercados.es/en/bme-exchange/trading/trading-calendar.html) (still on the BME/SIX-Group domain, not migrated to six-group.com) | Not yet — only 2026 shown. |
| Borsa Italiana (`borsa-italiana`) | [borsaitaliana.it/borsaitaliana/calendario-e-orari-di-negoziazione/calendario-borsa-orari-di-negoziazione.en.htm](https://www.borsaitaliana.it/borsaitaliana/calendario-e-orari-di-negoziazione/calendario-borsa-orari-di-negoziazione.en.htm) | Not yet — only 2025/2026 PDFs. |
| Wiener Börse (`wiener-borse`) | [wienerborse.at/en/trading/trading-information/trading-calendar](https://www.wienerborse.at/en/trading/trading-information/trading-calendar/) | Not yet — only 2026 PDF (`stock-exchange-holidays-2026-en.pdf`). |
| Warsaw Stock Exchange / GPW (`gpw`) | Management Board resolutions, linked from [gpw.pl/komunikaty-i-uchwaly-gpw](https://www.gpw.pl/komunikaty-i-uchwaly-gpw) — 2027 calendar is Resolution No. 754/2025 (`gpw.pl/pub/GPW/uchwaly/2025/754_2025.pdf`) | **Published.** Already in `holidays.json`. |
| Nasdaq Stockholm/Copenhagen/Helsinki (`nasdaq-nordic-stockholm`, `nasdaq-nordic-copenhagen`, `nasdaq-nordic-helsinki`) | [nasdaq.com/european-market-activity/trading-hours](https://www.nasdaq.com/european-market-activity/trading-hours) (old `nasdaqomxnordic.com/tradinghours` now 301-redirects here; the old domain's static PDF paths also now redirect into nasdaq.com rather than serving the legacy file, so there's no bypass via the retired domain) | **Not yet** — resolved 2026-08-17. The host blocks fetch tools at the WAF but loads fine in a real browser; the page carries "Exchange Holiday Schedule" tables for 2026, 2025 and 2024 only. The earlier "2026–2028" search snippet was a misread: that document is the **Fixed Income** Trading Calendar 2026–2028, a different market segment. The equity one is still titled "Nordic Equity Derivatives Trading Calendar **2024–2026**". |

## Asia-Pacific

| Market | Official source | 2027 status |
|---|---|---|
| TWSE (`twse`) | [twse.com.tw/en/trading/holiday.html](https://www.twse.com.tw/en/trading/holiday.html), backed by `twse.com.tw/rwd/en/holidaySchedule/holidaySchedule?response=json&year=YYYY` | Not yet — re-checked 2026-08-17. The JSON API still answers with the 2026 dataset no matter the year asked for; `year`, `queryYear` and the Chinese `yy` params all come back `"queryYear": 2026`. Don't read a 200 response as confirmation — check the `queryYear` field. |
| KRX (`krx`) | [global.krx.co.kr/contents/GLB/05/0501/0501110000/GLB0501110000.jsp](https://global.krx.co.kr/contents/GLB/05/0501/0501110000/GLB0501110000.jsp) | **Published** — as of 2026-08-17 the year selector reaches 2030 and querying 2027 returns a full 16-date table (it stopped at 2026 in July). The page needs a real browser: the year is submitted through a JS handler, not a URL parameter. All 16 dates are in `holidays.json`. KRX labels weekend-shifted days only as "Substitution Holiday"; `holidays.json` names each after the holiday it defers, matching how the 2026 entries read. |
| Tokyo Stock Exchange / JPX (`tse`) | [jpx.co.jp/english/corporate/about-jpx/calendar/index.html](https://www.jpx.co.jp/english/corporate/about-jpx/calendar/index.html) (blocks plain HTTP fetch with 403 — needed a text-extraction proxy or browser to read) | **Published**, with caveat — the page already lists 2027 non-trading days; movable dates (Vernal/Autumnal Equinox, Respect for the Aged Day) were cross-verified against independent sources and JPX's own BCP-test press release. Already added to `holidays.json`, but since the source had to be read via proxy rather than a direct render, spot-check the live page if precision matters. |
| Hong Kong Exchange (`hkex`) | Circulars under `hkex.com.hk/-/media/HKEX-Market/Services/Circulars-and-Notices/Participant-and-Members-Circulars/SEHK/<year>/` (2026 schedule: `ce_SEHK_CT_075_2025.pdf`) | **Published** — circular **CT/077/26** dated 2026-06-01, `.../SEHK/2026/ce_SEHK_CT_077_2026.pdf`. Thirteen weekday closures plus three half days, all in `holidays.json`. Cross-checked against the gazette at [gov.hk/en/about/abouthk/holiday/2027.htm](https://www.gov.hk/en/about/abouthk/holiday/2027.htm): the circular's 13 dates are exactly the 17 gazetted general holidays minus the four falling on a Saturday. Two things to keep straight — 2027-12-27 is the "first weekday after Christmas Day," a general holiday in its own right rather than a substitute for Christmas Day (a Saturday that year); and the circular states half days without a closing time, so the `12:00` in `holidays.json` comes from HKEX's morning-only session, matching the 2026 entries. |
| SGX (`sgx`) | **Source URL needs rediscovering.** The recorded `sgx.com/bcp/annual-market-exercise-calendar` is now dead, and `/securities/trading-hours-calendar` returns `route: null` from SGX's own content API. The surviving `annual-market-exercise-calendar-v2` is the **business-continuity exercise** calendar, not trading holidays — don't mistake one for the other. Derivatives circulars ("DTAM") under `api2.sgx.com`. | Not found — weaker than the other "not yet" rows: this is absence of evidence on the official domain after its calendar page moved, not a positive SGX statement. Re-check needs the new page located first (`sgx.com/sitemap.xml` was the next thing to try). |
| ASX (`asx`) | Cash equities: [asx.com.au/markets/market-resources/trading-hours-calendar/cash-market-trading-hours/trading-calendar](https://www.asx.com.au/markets/market-resources/trading-hours-calendar/cash-market-trading-hours/trading-calendar) | Not yet for cash equities (shows only 2026). Note: ASX's separate **ASX 24 futures** calendar already has a [2027 PDF](https://www.asx.com.au/content/dam/asx/markets/market-resources/t24-trading-calendars/T24-trading-calendar2027.pdf) — not relevant to this app since it's derivatives, not the cash market. |
| NZX (`nzx`) | Announcement memos, e.g. [nzx.com/announcements/463713](https://www.nzx.com/announcements/463713) ("NZX Market Holidays – 2025/2027") | **Partially published** — only the New Year period is out this far: 2026-12-31 (abbreviated trading), 2027-01-01, 2027-01-04 (observed). Both are in `holidays.json`. Re-checked 2026-08-17 and the memo is unchanged (still dated 2025-12-01, no newer one), but note the schedule itself lives in a PDF attachment that could not be retrieved by any route tried — WebFetch, the `r.jina.ai` proxy (403), `api.nzx.com` (403), or a real browser (the attachment element never resolves past "Loading…"). So the row above is carried forward from the memo title and earlier research, not re-read from the attachment. |

## Notes

- "Not yet published" doesn't mean the date doesn't exist anywhere — third-party
  aggregator sites (calendarlabs.com, mrtopstep.com, etc.) sometimes list
  provisional dates ahead of the official source. Those were deliberately
  excluded from `holidays.json` per this research; only re-add once the
  exchange's own site confirms them.
- JS-rendered or WAF-protected official sites (LSE, Nasdaq Nordic, KRX)
  resisted plain HTTP fetch tools — if re-checking these, use a real browser
  rather than a fetch/curl-style tool. All three were readable this way on
  2026-08-17, and two of them turned out to have published 2027 already, so
  treat "fetch failed" as unknown rather than as "not published."
- JPX (`jpx.co.jp`) and HKEX (`hkex.com.hk`) block plain fetches with HTTP 403;
  a text-extraction proxy or browser was needed.
- KRX's page is also the place to re-check **past** years. The 2026-08-17 sweep
  compared its 2026 table against `holidays.json` and found two closures the
  file was missing — 2026-06-03 (published only as "Temporary Holiday") and
  2026-07-17 (Constitution Day, restored as a South Korean public holiday
  effective 2026 after an 18-year absence, and left with a blank reason cell in
  KRX's own table). Both are now recorded. Worth repeating for other markets:
  an exchange adding a holiday mid-year is not something a "has 2027 shipped
  yet?" check would otherwise catch.
