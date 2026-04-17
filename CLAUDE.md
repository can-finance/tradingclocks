# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Dev Server

Node.js is installed via **nvm inside WSL** — it is not available on the Windows PATH. All npm commands must be run through WSL:

```bash
# Install dependencies (first time or after pulling)
wsl -e bash -c "source ~/.nvm/nvm.sh; cd /mnt/c/Users/JamesThai/OneDrive/Claude/tradingclocks && npm install"

# Start dev server (available at http://localhost:5173)
wsl -e bash -c "source ~/.nvm/nvm.sh; cd /mnt/c/Users/JamesThai/OneDrive/Claude/tradingclocks && npm run dev -- --host"

# Production build (output to ./dist)
wsl -e bash -c "source ~/.nvm/nvm.sh; cd /mnt/c/Users/JamesThai/OneDrive/Claude/tradingclocks && npm run build"
```

Deployment is automatic: every push to `main` triggers the GitHub Actions workflow (`.github/workflows/deploy.yml`) which builds and deploys to GitHub Pages via `can-finance/tradingclocks`.

## Architecture Overview

This is a **vanilla TypeScript + Vite** single-page app with no frontend framework. It has multiple HTML entry points compiled by Vite:

| Entry | Source | Purpose |
|---|---|---|
| `index.html` | `src/main.ts` | Main trading clocks dashboard |
| `editor.html` | `src/editor.ts` | UI to view/override market hours |
| `schedule.html` | `src/schedule.ts` | Next-weekday market schedule table |
| `dst.html` | `src/dst.ts` | DST transition reference tool |
| `holidays-summary.html` | `src/holidays-summary.ts` | Holiday calendar view |

### Core Data Flow

```
public/markets-config.json  ──→  markets.ts (loadMarketsConfig)  ──→  main.ts (renderClocks)
public/holidays.json        ──→  holidays.ts (loadHolidaysConfig) ──→  timezone.ts (getMarketStatus)
```

Both config files are fetched at runtime (not bundled), so they can be edited without a rebuild.

### Key Modules

**`src/timezone.ts`** — The most critical file. Contains all time logic:
- `parseTimeInTimezone(timeStr, timezone)` — converts an `HH:MM` string into a UTC `Date` for today in the given timezone. Uses `Intl.DateTimeFormat` with full date+time components to correctly handle UTC±12 edge cases.
- `getMarketStatus(market, overrides)` — returns a `MarketStatus` object with `isOpen`, `timeUntil`, `nextEvent`, holiday info, and lunch break state. This is called once per market per second.
- `formatCountdown(ms)` — formats milliseconds as `HH:MM:SS` or `Xd HH:MM:SS`.

**`src/timeService.ts`** — Singleton (`timeService`) that wraps `Date.now()`. All time reads in the app go through `timeService.getNow()`, enabling the Time Travel debug feature to simulate any date/time. Never call `new Date()` or `Date.now()` directly.

**`src/markets.ts`** — Loads and exports the `markets` array from `markets-config.json`. Markets are sorted by GMT offset descending (Asia-Pacific first). Falls back to NYSE-only hardcoded default if the fetch fails.

**`src/holidays.ts`** — Loads `holidays.json` into a runtime cache. `getMarketHolidays(marketId, year)` supports string aliases so e.g. `"nasdaq": "nyse"` shares the same holiday list.

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
