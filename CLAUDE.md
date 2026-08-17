# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Dev Server

**Always run Node commands inside Docker** — never `npm install`/`npm run dev`/etc. directly on the host, whether via the Windows-native Node install or via WSL against the mounted project path (`/mnt/c/...`). Either of those installs `node_modules` straight into this OneDrive-synced folder, which is exactly what the containerized setup exists to avoid (see the global `node_modules`-in-OneDrive policy). If you ever find a stray `node_modules` directory here, delete it — it means a command bypassed Docker.

```bash
docker compose up          # build (first time) and start the dev server at http://localhost:5173
docker compose up --build  # rebuild the image after package.json changes
docker compose up preview  # production build + serve dist at http://localhost:4173 (tests prerendered pages)
docker compose exec tradingclocks npm run build      # production build (output to ./dist)
docker compose exec tradingclocks npx tsc --noEmit    # type-check
```

Deployment is automatic: every push to `main` triggers the GitHub Actions workflow (`.github/workflows/deploy.yml`) which builds and deploys to GitHub Pages via `can-finance/tradingclocks`.

Notable **user-facing** changes should be recorded in `CHANGELOG.md` under `[Unreleased]` (Keep a Changelog format). Keep entries high-level: significant user-facing changes and major code-structure changes qualify; minor bug fixes and polish live in the git history only. Dev-ops/internal changes (Docker config, CI pipeline tweaks, test flakiness fixes, tooling) do not belong in the changelog — it's meant for users of the site, not contributors.

## Architecture Overview

This is a **vanilla TypeScript + Vite** single-page app with no frontend framework. It has multiple HTML entry points compiled by Vite:

| Entry | Source | Purpose |
|---|---|---|
| `index.html` | `src/main.ts` | Main trading clocks dashboard |
| `editor.html` | `src/editor.ts` | UI to view/override market hours |
| `schedule.html` | `src/schedule.ts` | Next-weekday market schedule table |
| `dst.html` | `src/dst.ts` | DST transition reference tool |
| `holidays-summary.html` | `src/holidaysPage.ts` | 2026 holiday calendar view |
| `holidays-2027.html` | `src/holidaysPage.ts` | 2027 holiday calendar view |

### Core Data Flow

```
public/markets-config.json  ──→  markets.ts (loadMarketsConfig)  ──→  main.ts (renderClocks)
public/holidays.json        ──→  holidays.ts (loadHolidaysConfig) ──→  timezone.ts (getMarketStatus)
```

Both config files are fetched at runtime (not bundled), so they can be edited without a rebuild.

### Build-Time Prerendering

The content pages would otherwise serve an empty container and build their tables
from JSON after load, which left search engines reading them as thin content.
`scripts/prerender.ts` is a Vite plugin (build only — dev still renders client-side)
that runs the same markup builders the browser uses and writes the result into the
HTML. Pages opt in with a placeholder comment inside the container:

```html
<div id="dst-table-container"><!--prerender:dst--></div>
```

The builders live in `src/holidaysMarkup.ts`, `src/dstMarkup.ts`, and
`src/scheduleMarkup.ts`. They are pure string functions with no DOM or network
access so the same code runs in Node and the browser — **keep them that way**, or
the build will break. A placeholder naming an unknown builder, or one that yields
no markup, fails the build rather than silently shipping an empty page again.

Client scripts skip re-rendering when the container already has children (i.e. in
production). `schedule.ts` is the exception: it always re-renders, because the
prerender can only emit market-local hours and the page's job is converting them
to the visitor's timezone.

Each holidays page declares its year on the container (`data-year="2026"`), which
both the prerender and the browser read, so they can't disagree about which year
is on screen.

### Key Modules

**`src/timezone.ts`** — The most critical file. Contains all time logic:
- `parseTimeInTimezone(timeStr, timezone)` — converts an `HH:MM` string into a UTC `Date` for today in the given timezone. Delegates to `getDateFromIsoInTz` in `src/dateUtils.ts`, which uses a two-pass `Intl.DateTimeFormat` offset lookup so DST transition days and UTC±12 edge cases resolve correctly.
- `getMarketStatus(market, overrides)` — returns a `MarketStatus` object with `isOpen`, `timeUntil`, `nextEvent`, holiday info, and lunch break state. This is called once per market per second. Next-open times are computed by finding the next trading *date* (`YYYY-MM-DD` string, skipping weekends/holidays) and converting `date + openTime` in the market's timezone — never by adding days to a `Date` with `setDate`, which drifts across DST transitions.
- `formatCountdown(ms)` — formats milliseconds as `HH:MM:SS` or `Xd HH:MM:SS`.

**`src/timeService.ts`** — Singleton (`timeService`) that wraps `Date.now()`. All time reads in the app go through `timeService.getNow()`, enabling the Time Travel debug feature to simulate any date/time. Never call `new Date()` or `Date.now()` directly.

**`src/markets.ts`** — Loads and exports the `markets` array from `markets-config.json`. Markets are sorted by GMT offset descending (Asia-Pacific first). Falls back to NYSE-only hardcoded default if the fetch fails.

**`src/holidays.ts`** — Loads `holidays.json` into a runtime cache. `getMarketHolidays(marketId, year)` supports string aliases (a market id mapped to another id string shares that market's holiday list). No alias is currently in the data; the mechanism is kept for markets that share a calendar.

**`src/storage.ts`** — All `localStorage` access is here. Persists selected market IDs (`tradingClocks_selectedMarkets`) and per-market time overrides (`tradingClocks_timeOverrides`).

**`src/debug.ts`** — Dev-only Time Travel overlay (`Shift+D` to toggle). Only imported in development via `import.meta.env.DEV` guard in `main.ts`.

### Config Files

**`public/markets-config.json`** — Array of market objects. Each entry requires:
```json
{
  "id": "gpw",               // unique key used everywhere
  "name": "Warsaw Stock Exchange",
  "code": "GPW",
  "country": "Poland",
  "countryCode": "PL",       // ISO 3166-1 alpha-2, used for flagcdn.com images
  "flag": "🇵🇱",
  "timezone": "Europe/Warsaw", // must be a valid IANA timezone
  "openTime": "09:00",
  "closeTime": "17:00",
  "region": "Europe",        // "Americas" | "Europe" | "Asia-Pacific"
  "dstStart": "2026-03-29",  // YYYY-MM-DD, null if no DST
  "dstEnd": "2026-10-25",
  "lunchStart": null,        // optional: "12:00"
  "lunchEnd": null           // optional: "13:00"
}
```

**`public/holidays.json`** — Structured as `{ "2026": { "marketId": [ { date, name, status } ] } }`. Status is `"closed"` or `"early-close"`. Early-close entries should also include a `"closeTime"` field. Market IDs can be string aliases pointing to another market's ID.

### DST Handling

DST is handled entirely by the native `Intl.DateTimeFormat` API using the IANA timezone name (e.g. `Europe/Warsaw`). The `dstStart`/`dstEnd` fields in `markets-config.json` are informational only — they are not used in any calculations.

### Clock Card Status Logic (`main.ts`)

Status priority: `is-on-lunch` → `is-closing-soon` (< 30 min) → `is-open` → `is-opening-soon` (< 30 min, not weekend) → `is-closed`. Cards are sorted open-first, then by `timeUntil`, with a 1-minute hysteresis to prevent constant reordering.
