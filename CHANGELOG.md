# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.4.1] - 2026-10-26

### Added

- **Full 2027 holiday calendars for Nasdaq Stockholm, Copenhagen and Helsinki,
  the Australian Securities Exchange, and Wiener Börse**, now published
  officially. Singapore's 2027 closures are in too (half days still to come).

## [0.4.0] - 2026-08-17

### Added

- **An About page**, linked from the dashboard menu and footer: what the site
  is, which exchanges it covers, where the data comes from, and how to report
  an error.
- **Full 2027 holiday calendars for the London, Korea, and Hong Kong stock
  exchanges**, now published officially — all three read "Fully Updated" on
  the 2027 page.

### Changed

- **Holiday, market hours, and DST pages load instantly** and work with
  JavaScript disabled.
- **Faster, smoother loading and updating** of the dashboard and its clocks.

## [0.3.0] - 2026-07-12

### Added

- **Warsaw Stock Exchange (GPW)**, with 2026 holidays and DST dates.
- **A dedicated 2027 holidays page**, linked from the 2026 holidays page and
  back. Each market's card shows a status badge — "Fully Updated," "Partially
  Updated," or "Awaiting Official Dates" — so it's clear at a glance which
  2027 calendars are still provisional.
- **2027 holiday calendars for NYSE/Nasdaq, XETRA, SIX, GPW, JPX (Tokyo), and
  partial NZX**, sourced directly from each exchange's official site.
- **Link previews**: shared links now show the site's title, description, and
  a preview image.

### Fixed

- **NZX (New Zealand Exchange) showed a spurious "1 day" in its countdown.**

## [0.2.0] - 2026-07-05

### Added

- **The Market Hours page now accounts for holidays**: fully closed markets
  show "Closed — [holiday]", and early-close days show the shortened session
  with an "Early close" badge.

### Fixed

- **Countdowns and times were off by an hour around daylight-saving
  changes.** Next-open countdowns across a DST weekend, and times on the day
  of a transition itself, now resolve correctly.
- **DST transition dates displayed one day early** for visitors in the
  Americas.
