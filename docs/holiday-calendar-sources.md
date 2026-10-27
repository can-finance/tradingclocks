# Exchange Holiday Calendar Sources

Official (not third-party aggregator) sources for each exchange's trading-holiday
calendar, used to populate `public/holidays.json`. Recorded so future updates
don't require re-searching from scratch.

**Last researched:** 2026-10-26 (checking 2027 availability, plus a re-check of
the remaining 2026 dates and of the already-published 2027 calendars).

General pattern: most exchanges publish next year's calendar in **Q4 of the prior
year** (roughly Oct–Dec). If a status below says "not yet published," re-check
in December 2026.

## Americas

| Market | Official source | 2027 status |
|---|---|---|
| NYSE (`nyse`) | [nyse.com/markets/hours-calendars](https://www.nyse.com/markets/hours-calendars) — corroborated by ICE's press release "NYSE Group Announces 2026, 2027 and 2028 Holiday and Early Closings Calendar" | **Published.** In `holidays.json`; re-checked 2026-10-26, unchanged. (US Nasdaq follows the same calendar but has no market entry in this app; a former unused `"nasdaq"` alias was removed 2026-08-17.) |
| TSX (`tsx`) | [tsx.com/en/trading/calendars-and-trading-hours/calendar](https://www.tsx.com/en/trading/calendars-and-trading-hours/calendar) (note: `/holiday-schedule` path 404s — use `/calendar`). Cross-check: TMX's yearly "Settlement Schedule for … Holidays" PDF (2026: [tsx.com/en/resource/3407](https://www.tsx.com/en/resource/3407/)), which separates "Stock Market Holiday" (closed) from "Banking Holiday" (open, no settlement). | Not yet — still only 2025–2026 on 2026-10-26. **TSX trades on the National Day for Truth and Reconciliation (Sep 30) and on Remembrance Day (Nov 11)** — both are banking holidays only. Sep 30 was wrongly listed as a 2026 closure until 2026-10-26; don't add it for 2027. Christmas Eve closes early at 13:00. |

## Europe

| Market | Official source | 2027 status |
|---|---|---|
| LSE (`lse`) | [londonstockexchange.com/en/resources/markets-products/business-days](https://www.londonstockexchange.com/en/resources/markets-products/business-days) (the old `/equities-trading/business-days` path redirects here) | **Published.** JS-rendered, so it needs a real browser. The table runs through 2029. All ten 2027 entries are in `holidays.json`, including the two half days (Dec 24 and Dec 31, "closing process commences from 12:30 London time"). Re-checked 2026-10-26, unchanged. |
| Euronext Paris/Amsterdam/Brussels/Dublin (`euronext-paris`, `euronext-amsterdam`, `euronext-brussels`, `euronext-dublin`) | [euronext.com/en/trading/trading-hours-holidays](https://www.euronext.com/en/trading/trading-hours-holidays) (all four markets share one circular; the yearly circular PDF is on connect2.euronext.com — 2026's was IF251107CADE, issued Nov 2025) | Not yet — page still covers only 2024–2026 on 2026-10-26; 2027's circular likely lands ~Nov 2026. The page confirms 2026's Dec 24/31 "Half Trading Day" but states no closing time (the 14:00 in `holidays.json` is unverified against it). |
| Oslo Børs (`oslo-bors`) | Same Euronext page as above (Oslo joined Euronext) | Not yet — same 2024–2026 coverage. |
| Deutsche Börse / XETRA (`xetra`) | [cashmarket.deutsche-boerse.com/cash-en/trading/trading-calendar-and-trading-hours](https://www.cashmarket.deutsche-boerse.com/cash-en/trading/trading-calendar-and-trading-hours) | **Published** (table runs 2026–2032, though the site caveats it's "for information purposes only" for future years). In `holidays.json`; unchanged on 2026-10-26. The page warns "deviating trading hours may apply" on **2026-12-30**, with a circular to follow — re-check in December. |
| SIX Swiss Exchange (`six`) | Landing page: [six-group.com/.../trading-currency-holiday-calendar.html](https://www.six-group.com/en/market-data/news-tools/trading-currency-holiday-calendar.html); PDF: `https://www.six-group.com/dam/download/the-swiss-stock-exchange/trading/trading-provisions/regulation/trading-guides/trading-calendar-2027.pdf` | **Published** — the landing page still only links the 2026 PDF; the 2027 PDF exists at the predictable URL (swap the year). In `holidays.json`; unchanged on 2026-10-26. |
| Bolsa de Madrid / BME (`bme`) | [bolsasymercados.es/en/bme-exchange/trading/trading-calendar.html](https://www.bolsasymercados.es/en/bme-exchange/trading/trading-calendar.html) (still on the BME domain, not migrated to six-group.com) | Not yet — only 2026 shown on 2026-10-26. BME has historically issued the next year's calendar in late November. |
| Borsa Italiana (`borsa-italiana`) | [borsaitaliana.it/borsaitaliana/calendario-e-orari-di-negoziazione/calendario-borsa-orari-di-negoziazione.en.htm](https://www.borsaitaliana.it/borsaitaliana/calendario-e-orari-di-negoziazione/calendario-borsa-orari-di-negoziazione.en.htm). PDF pattern: `.../calendario-e-orari-di-negoziazione/tradingcalendar-YYYY.en.pdf` (shaded cells = "Closing day") | Not yet — only 2025/2026 PDFs; the 2027 URL 404s. **Dec 24 and Dec 31 are full closures**, not half days — 2026 was wrongly recorded as 12:30 early closes until 2026-10-26. |
| Wiener Börse (`wiener-borse`) | [wienerborse.at/en/trading/trading-information/trading-calendar](https://www.wienerborse.at/en/trading/trading-information/trading-calendar/), which links a yearly PDF `uploads/u/cms/files/trading/stock-exchange-holidays-YYYY-en.pdf` | **Published** (the 2027 PDF was created 2026-08-17, just after the previous sweep). All six 2027 closures are in `holidays.json`. The PDF also lists public holidays that are still trading days (Jan 6, Ascension, Whit Monday, Corpus Christi, Nov 1, Dec 8) — not closures. |
| Warsaw Stock Exchange / GPW (`gpw`) | Management Board resolutions, linked from [gpw.pl/komunikaty-i-uchwaly-gpw](https://www.gpw.pl/komunikaty-i-uchwaly-gpw) — 2027 calendar is Resolution No. 754/2025 (`gpw.pl/pub/GPW/uchwaly/2025/754_2025.pdf`); the live "Dni bez sesji" list on gpw.pl/szczegoly-sesji is a quick cross-check | **Published.** In `holidays.json`; unchanged on 2026-10-26. |
| Nasdaq Stockholm/Copenhagen/Helsinki (`nasdaq-nordic-stockholm`, `nasdaq-nordic-copenhagen`, `nasdaq-nordic-helsinki`) | [nasdaq.com/european-market-activity/trading-hours](https://www.nasdaq.com/european-market-activity/trading-hours) — use the Equity column of the "Exchange Holiday Schedule YYYY" tables. Blocks fetch tools at the WAF but loads in a real browser. The equity derivatives PDF is now "Nordic Equity Derivatives Trading Calendar 2026–2028". | **Published** (found 2026-10-26). All three 2027 lists are in `holidays.json`. The page gives dates only, so holiday names in the file are ours. **Stockholm has 13:00 half days** (eves of Epiphany, Ascension and All Saints', Maundy Thursday, Walpurgis Eve) — these were missing from 2026 until 2026-10-26. Copenhagen and Helsinki list no half days. |

## Asia-Pacific

| Market | Official source | 2027 status |
|---|---|---|
| TWSE (`twse`) | [twse.com.tw/en/trading/holiday.html](https://www.twse.com.tw/en/trading/holiday.html), backed by `twse.com.tw/rwd/en/holidaySchedule/holidaySchedule?response=json&date=YYYYMMDD` | Not yet — the API is queried with **`date=YYYYMMDD`** (`year`, `queryYear` and `yy` are ignored and silently return the current year). On 2026-10-26, `date=20270101` answered `"queryYear":2027,"total":0` — a genuine empty result. The 2026 calendar was announced in Nov 2025, so expect 2027 ~Nov 2026. |
| KRX (`krx`) | [global.krx.co.kr/contents/GLB/05/0501/0501110000/GLB0501110000.jsp](https://global.krx.co.kr/contents/GLB/05/0501/0501110000/GLB0501110000.jsp) | **Published.** The page needs a real browser: the year is submitted through a JS handler, not a URL parameter. All 16 dates are in `holidays.json`; re-checked 2026-10-26, unchanged for both 2026 and 2027. KRX labels weekend-shifted days only as "Substitution Holiday"; `holidays.json` names each after the holiday it defers. |
| Tokyo Stock Exchange / JPX (`tse`) | [jpx.co.jp/english/corporate/about-jpx/calendar/index.html](https://www.jpx.co.jp/english/corporate/about-jpx/calendar/index.html) (blocks plain HTTP fetch with 403, but loads directly in the built-in browser) | **Published.** Read directly in a browser on 2026-10-26; 2027 matches `holidays.json`, including the weekend entries the source also lists. |
| Hong Kong Exchange (`hkex`) | Circulars under `hkex.com.hk/-/media/HKEX-Market/Services/Circulars-and-Notices/Participant-and-Members-Circulars/SEHK/<year>/` (2026 schedule: `ce_SEHK_CT_075_2025.pdf`) | **Published** — circular **CT/077/26** dated 2026-06-01, `.../SEHK/2026/ce_SEHK_CT_077_2026.pdf`. Thirteen weekday closures plus three half days, all in `holidays.json`; no amending circular found by search on 2026-10-26. Cross-checked against the gazette at [gov.hk/en/about/abouthk/holiday/2027.htm](https://www.gov.hk/en/about/abouthk/holiday/2027.htm). 2027-12-27 is the "first weekday after Christmas Day," a general holiday in its own right; the circular states half days without a closing time, so the `12:00` comes from HKEX's morning-only session. |
| SGX (`sgx`) | [sgx.com/stock-exchange/trading](https://www.sgx.com/stock-exchange/trading) → "Trading Hours & Opening/Closing Routine" → "Trading Schedules" (expand the accordions; old `/securities/...` paths redirect to `/stock-exchange/...`). The page states SGX follows the Ministry of Manpower holiday calendar: [mom.gov.sg/employment-practices/public-holidays](https://www.mom.gov.sg/employment-practices/public-holidays). Don't confuse it with `annual-market-exercise-calendar-v2`, the business-continuity exercise calendar. | **Partially published.** The eight 2027 weekday closures in `holidays.json` come from MOM's gazetted list, which SGX says it follows. SGX's own half-day list (ends trading 12:00) still stops at 2026, so 2027's likely half days (Lunar New Year Eve 02-05, 12-24, 12-31) are **not** in the file yet. |
| ASX (`asx`) | Cash equities: [asx.com.au/markets/market-resources/trading-hours-calendar/cash-market-trading-hours/trading-calendar](https://www.asx.com.au/markets/market-resources/trading-hours-calendar/cash-market-trading-hours/trading-calendar) (WebFetch works) | **Published** (found 2026-10-26). All 2027 dates are in `holidays.json`. Half days: "Normal trading ceases at 14:10 (Sydney time)" — 2026 was wrongly recorded as 14:30 until 2026-10-26. ANZAC Day has no weekday substitute in either year (2027-04-26 is marked **open**); 2026-04-27 was wrongly listed as closed until 2026-10-26. The separate ASX 24 futures calendar is not relevant to this app. |
| NZX (`nzx`) | Announcement memos, e.g. [nzx.com/announcements/463713](https://www.nzx.com/announcements/463713) ("NZX Market Holidays – 2025/2027", 2025-12-01). The schedule is a PDF attachment (`api.nzx.com/public/announcement/463713/attachment/458063/463713-458063.pdf`): plain navigation **downloads** it and WebFetch gets 403, but an in-page `fetch()` from the announcement page can read it into memory. | **Partially published** — the memo runs only to 2027-01-04: 2027-01-01 and 2027-01-04 (observed) are in `holidays.json`. It also lists 2026-12-24 and 2026-12-31 as "abbreviated trading" without a time; the `13:30` in the file comes from NZX's own earlier notices (2018, 2024), since the trading-hours page the memo links (`nzx.com/investing/nzx-trading-hours`) now 404s. The next memo is likely early December 2026. |

## Notes

- "Not yet published" doesn't mean the date doesn't exist anywhere — third-party
  aggregator sites (calendarlabs.com, mrtopstep.com, etc.) sometimes list
  provisional dates ahead of the official source. Those were deliberately
  excluded from `holidays.json` per this research; only re-add once the
  exchange's own site confirms them. (SGX is the one deliberate exception, and
  only because SGX itself names the government calendar as its source.)
- JS-rendered or WAF-protected official sites (LSE, Nasdaq Nordic, KRX)
  resisted plain HTTP fetch tools — if re-checking these, use a real browser
  rather than a fetch/curl-style tool. Treat "fetch failed" as unknown rather
  than as "not published."
- **Don't navigate a browser straight to a PDF link** — on several exchanges
  (NZX, and potentially others) that triggers a file download / Save As dialog.
  WebFetch saves PDFs to a local copy that the Read tool can render; that
  worked for SIX, Wiener Börse, GPW, TMX and Borsa Italiana.
- KRX's page is also the place to re-check **past** years. The 2026-08-17 sweep
  found two 2026 closures the file was missing — 2026-06-03 (published only as
  "Temporary Holiday") and 2026-07-17 (Constitution Day, restored as a public
  holiday effective 2026). The 2026-10-26 sweep found more of the same kind
  (TSX, Borsa Italiana, ASX, Nasdaq Stockholm, NZX — see their rows): re-reading
  the current year's official table is worth doing on every pass, not only
  checking whether next year has shipped.
