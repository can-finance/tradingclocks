/**
 * Build-time prerendering.
 *
 * Every content page renders its tables from JSON at runtime, which left the
 * served HTML with nothing but a heading and an empty container. Search engines
 * read that as thin content — Google reported holidays-summary.html as
 * "Crawled - currently not indexed". This plugin runs the same markup builders
 * the browser uses and writes the result into the HTML at build time.
 *
 * Pages opt in by placing a placeholder comment in the container:
 *
 *     <div id="dst-table-container"><!--prerender:dst--></div>
 *
 * A placeholder with no matching builder (or a builder that produces nothing)
 * fails the build rather than silently shipping an empty page again.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

import type { Market } from '../src/types';
import type { Holiday, HolidaysConfig } from '../src/holidays';
import { getGMTOffset } from '../src/timezone';
import { buildHolidaysMarkup } from '../src/holidaysMarkup';
import { buildDstMarkup } from '../src/dstMarkup';
import { buildScheduleMarkup } from '../src/scheduleMarkup';
import { getNextWeekday, toDateStr } from '../src/dateUtils';

const PLACEHOLDER = /<!--\s*prerender:([a-z0-9-]+)\s*-->/gi;

function readJson<T>(relativePath: string): T {
    const url = new URL(`../public/${relativePath}`, import.meta.url);
    return JSON.parse(readFileSync(fileURLToPath(url), 'utf-8')) as T;
}

/** Mirrors loadMarketsConfig's ordering so prerendered and client markup agree. */
function loadMarkets(): Market[] {
    const config = readJson<{ markets: Market[] }>('markets-config.json');
    return [...config.markets].sort((a, b) => getGMTOffset(b.timezone) - getGMTOffset(a.timezone));
}

/** Mirrors getMarketHolidays, including its string-alias indirection. */
function makeHolidayLookup(): (marketId: string, year: number) => Holiday[] {
    const config = readJson<HolidaysConfig>('holidays.json');

    return (marketId, year) => {
        const yearData = config[String(year)];
        if (!yearData) return [];

        let marketData = yearData[marketId];
        if (typeof marketData === 'string') marketData = yearData[marketData];
        return (marketData as Holiday[]) || [];
    };
}

/**
 * Read the year a holidays page is for from its container's data-year, so the
 * prerender and the browser can never disagree about which year is on screen.
 */
function readYear(html: string): number {
    const match = html.match(/id="holidays-container"[^>]*\sdata-year="(\d{4})"/);
    if (!match) {
        throw new Error('prerender: holidays page is missing data-year on #holidays-container');
    }
    return Number(match[1]);
}

export function prerender(): Plugin {
    return {
        name: 'tradingclocks-prerender',
        apply: 'build',
        transformIndexHtml: {
            order: 'pre',
            handler(html, ctx) {
                if (!PLACEHOLDER.test(html)) return html;
                PLACEHOLDER.lastIndex = 0;

                const markets = loadMarkets();
                const getHolidays = makeHolidayLookup();

                // Both holiday placeholders share one build, so nav and content
                // can never disagree about the page's year or market set
                let holidaysMarkup: { nav: string; content: string } | undefined;
                const holidays = () =>
                    holidaysMarkup ??= buildHolidaysMarkup({ markets, year: readYear(html), getHolidays });

                const builders: Record<string, () => string> = {
                    'holidays-nav': () => holidays().nav,
                    'holidays-content': () => holidays().content,
                    dst: () => buildDstMarkup(markets),
                    schedule: () =>
                        buildScheduleMarkup({
                            markets,
                            targetDateStr: toDateStr(getNextWeekday(new Date())),
                            // Market-local hours: the visitor's timezone is
                            // unknowable here, and the client re-renders in it
                            // as soon as the page loads.
                            displayTimezone: null,
                            getHoliday: () => null,
                        }),
                };

                return html.replace(PLACEHOLDER, (_match, name: string) => {
                    const build = builders[name];
                    if (!build) {
                        throw new Error(`prerender: no builder named "${name}" (in ${ctx.path})`);
                    }

                    const markup = build();
                    if (markup.trim() === '') {
                        throw new Error(`prerender: builder "${name}" produced no markup (in ${ctx.path})`);
                    }
                    return markup;
                });
            },
        },
    };
}
