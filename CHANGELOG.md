# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **A dedicated 2027 holidays page** (`holidays-2027.html`, `src/holidays-2027.ts`),
  linked from the 2026 holidays page and back. Each market's card shows a
  status badge — "Fully Updated," "Partially Updated," or "Awaiting Official
  Dates" — based on the same publication status tracked in
  `docs/holiday-calendar-sources.md`, so it's clear at a glance which 2027
  calendars are still provisional.
- **The app version in the dashboard footer** (`v{package version}`), read
  from `package.json` at build time and injected via the `__APP_VERSION__`
  global in `vite.config.ts`.
- **2027 holiday calendars for NYSE/Nasdaq, XETRA, SIX, GPW, JPX (Tokyo), and
  partial NZX**, sourced directly from each exchange's official site (previously
  only New Year's Day was populated for every market's 2027 entry). Also added
  `docs/holiday-calendar-sources.md`, a reference table of each exchange's
  official holiday-calendar source URL and its current 2027 publication status,
  so future updates don't require re-researching from scratch. (`public/holidays.json`)

### Fixed

- **Docker dev container never picked up host-side file edits.** Docker
  Desktop's Windows/WSL2 bind mount doesn't forward inotify events, so Vite's
  default file watcher never saw changes made from the Windows host — the
  container kept serving whatever code was running at last boot. Enabled
  polling (`CHOKIDAR_USEPOLLING=true` in `docker-compose.yml`, wired into
  `server.watch.usePolling` in `vite.config.ts`) so edits now reliably trigger
  a restart/HMR update.
- **`getMarketStatus` test for mid-session countdown was flaky in CI.** The test
  set the simulated clock with `timeService.setTime()` without freezing it, so
  the clock kept advancing in real time between the call and the assertion;
  on a slower CI runner this produced an off-by-a-few-ms mismatch in
  `timeUntil`. The test now calls `timeService.freeze()` before `setTime()`, so
  the frozen instant is written directly instead of drifting. (`src/timezone.test.ts`)
- CI's `node-version` was pinned to 20, which GitHub Actions runners no longer
  support natively (silently forcing the job onto Node 24 with a deprecation
  warning). Bumped to 24 to match. (`.github/workflows/deploy.yml`)

## [0.2.0] - 2026-07-05

### Added

- Vitest test suite (46 tests) covering the timezone/DST logic
  (`getMarketStatus`, `getDateFromIsoInTz`, `parseTimeInTimezone`,
  `formatCountdown`, `getGMTOffset`), holiday lookup/aliases, date helpers,
  and HTML escaping. Run with `npm test`; CI now runs the suite before every
  deploy build.

### Changed

- Config-sourced strings (market names, countries, codes, holiday names) are
  now HTML-escaped before being interpolated into rendered markup, hardening
  against markup injection from config data. (`src/htmlUtils.ts`, all render
  modules)
- The trading-day progress bar now shows empty (0%) before the market opens
  instead of a misleading full bar; the full bar still represents the last
  completed session after close. (`src/main.ts`)
- `localStorage` reads now validate the parsed shape (array of strings for
  selected markets, plain object for time overrides) so corrupted storage
  can't crash the dashboard. (`src/storage.ts`)
- The Time Travel debug hotkey (Shift+D) no longer fires while typing in a
  form field. (`src/debug.ts`)
- The dashboard loads `markets-config.json` and `holidays.json` in parallel.
  (`src/main.ts`)
- CI installs dependencies with `npm ci` instead of `npm install` for
  lockfile-faithful builds. (`.github/workflows/deploy.yml`)
- Updated Vite via `npm audit fix` to clear dev-server-only security
  advisories.

### Removed

- Dead code: unused `getHolidayForDate` in `src/holidays.ts` (which also had a
  latent UTC/local date mismatch), unused `getUniqueCountries` and
  `getMarketById` in `src/markets.ts`, the unused `Country` type, the
  write-only `pendingChanges` map in `src/editor.ts`, and a duplicated
  `getGMTOffset` implementation in `src/editor.ts` (now imported from
  `src/timezone.ts`).
- Duplicated constants: `src/storage.ts` and `src/main.ts` now use
  `STORAGE_KEYS`/`TIMING` from `src/constants.ts` instead of hardcoded keys
  and thresholds; flagcdn.com URLs are built by a shared `getFlagUrl` helper;
  the unique-markets-per-country logic in the schedule and DST pages now uses
  `getUniqueMarketsPerCountry` from `src/markets.ts`.

### Documentation

- `CLAUDE.md`: corrected the dev-server instructions (Node.js runs natively on
  Windows; the old WSL/nvm commands referenced a stale path), documented the
  DST-safe next-open computation, and noted the changelog convention.
- Added the missing `flag` field to the NYSE entry in
  `public/markets-config.json` and the optional `flag` property to the
  `Market` type.

### Fixed

- **Next-open countdowns were off by one hour across DST transitions.** The
  holiday, weekend, and after-close branches of `getMarketStatus` computed the
  next open by adding days to today's open instant with `Date.setDate()`,
  which neither re-derives the market's UTC offset for the target date nor
  accounts for the browser's own DST changes. Next opens are now computed by
  finding the next trading *date* (as a `YYYY-MM-DD` string) and converting
  `date + openTime` to UTC in the market's timezone. (`src/timezone.ts`)
- **DST transition dates displayed one day early for users west of Greenwich.**
  `formatDstDate` parsed `"YYYY-MM-DD"` via `new Date()`, which interprets it
  as UTC midnight; it now parses the components into a local date.
  (`src/dateUtils.ts`)
- **Holiday summary page was hardcoded to 2026.** The year (page heading,
  intro, and table data) is now derived from the current date via
  `timeService`. (`src/holidays-summary.ts`, `holidays-summary.html`)
- **Wall-clock→UTC conversion could pick a stale offset on DST transition
  days.** The single-pass offset estimation sampled the timezone offset at the
  wrong instant when a transition fell between the sample point and the
  answer. Conversion is now consolidated into `getDateFromIsoInTz` with a
  two-pass offset lookup; `parseTimeInTimezone` delegates to it.
  (`src/dateUtils.ts`, `src/timezone.ts`)
- **Editor: typing a market's default time back in did not clear its saved
  override.** "Save All Changes" now removes stored overrides for rows whose
  inputs match the config defaults, instead of silently leaving the old
  override active on the dashboard. (`src/editor.ts`)
- **Market Hours schedule page ignored holidays.** The page now loads the
  holiday calendar: fully closed markets show "Closed — [holiday]", early-close
  days show the adjusted close time with an "Early close" badge, and the
  session duration accounts for early closes that shorten or remove the lunch
  break. (`src/schedule.ts`)
