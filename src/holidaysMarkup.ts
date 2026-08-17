/**
 * Holiday table markup.
 *
 * Pure string building with no DOM or network access, so the same code runs in
 * the browser and in the build-time prerender (see scripts/prerender.ts).
 */

import type { Market } from './types';
import type { Holiday } from './holidays';
import { getGMTOffset } from './timezone';
import { REGIONS, getFlagUrl } from './constants';
import { escapeHtml } from './htmlUtils';

export type UpdateStatus = 'confirmed' | 'partial' | 'pending';

/**
 * Whether each exchange has published its full holiday calendar for a given
 * year. Sourced from docs/holiday-calendar-sources.md — update both together
 * when an exchange publishes (or a published date turns out to need revision).
 *
 * A year with no entry here renders no status badges at all, which is the
 * normal state once every exchange has confirmed.
 */
const UPDATE_STATUS: Record<number, Partial<Record<string, UpdateStatus>>> = {
    2027: {
        nyse: 'confirmed',
        lse: 'confirmed',
        xetra: 'confirmed',
        six: 'confirmed',
        gpw: 'confirmed',
        krx: 'confirmed',
        tse: 'confirmed',
        hkex: 'confirmed',
        nzx: 'partial',
    },
};

function renderStatusBadge(marketId: string, year: number): string {
    const yearStatus = UPDATE_STATUS[year];
    if (!yearStatus) return '';

    const status = yearStatus[marketId] ?? 'pending';
    if (status === 'confirmed') {
        return '<span class="badge badge-confirmed">Fully Updated</span>';
    }
    if (status === 'partial') {
        return '<span class="badge badge-pending">Partially Updated</span>';
    }
    return '<span class="badge badge-pending">Awaiting Official Dates</span>';
}

function formatHolidayDate(isoDate: string): string {
    // Parse as a local date, not UTC, so the weekday never shifts a day.
    const [y, m, d] = isoDate.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
}

function sortByOffsetDescending(markets: Market[], region: string): Market[] {
    return markets
        .filter(m => m.region === region)
        .sort((a, b) => getGMTOffset(b.timezone) - getGMTOffset(a.timezone));
}

export interface HolidaysMarkupInput {
    markets: Market[];
    year: number;
    /** Holiday lookup for a market id, already resolved through any aliases. */
    getHolidays: (marketId: string, year: number) => Holiday[];
}

export interface HolidaysMarkup {
    nav: string;
    content: string;
}

/**
 * Build the sidebar navigation and holiday cards for one year.
 *
 * Markets with no holidays on record for the year are omitted from both, so the
 * nav and the content always list the same set.
 */
export function buildHolidaysMarkup({ markets, year, getHolidays }: HolidaysMarkupInput): HolidaysMarkup {
    let nav = '';
    let content = '';

    for (const region of REGIONS) {
        const regionMarkets = sortByOffsetDescending(markets, region);
        if (regionMarkets.length === 0) continue;

        const withHolidays = regionMarkets
            .map(market => ({ market, holidays: getHolidays(market.id, year) }))
            .filter(entry => entry.holidays.length > 0);
        if (withHolidays.length === 0) continue;

        nav += `<div class="holidays-nav-region">${region}</div>`;

        const regionId = region.toLowerCase().replace(/\s+/g, '-');
        content += `<h2 class="dst-region-title holiday-region-title" id="region-${regionId}">${region}</h2>`;

        for (const { market, holidays } of withHolidays) {
            const marketId = escapeHtml(market.id.toLowerCase());

            nav += `
                    <a href="#market-${marketId}" class="holidays-nav-link" data-market="${marketId}">
                        <img class="market-item-flag" src="${getFlagUrl(market.countryCode)}" alt="${escapeHtml(market.country)}" />
                        <span>${escapeHtml(market.name)}</span>
                    </a>
                `;

            const rows = holidays.map(holiday => {
                let statusBadge = '';
                if (holiday.status === 'closed') {
                    statusBadge = '<span class="badge badge-neutral">Closed</span>';
                } else if (holiday.status === 'early-close') {
                    statusBadge = `<span class="badge badge-active">Early Close<br><span class="badge-close-time">${escapeHtml(holiday.closeTime || '')}</span></span>`;
                }

                return `
                    <tr>
                        <td class="time-cell holiday-date-cell">${formatHolidayDate(holiday.date)}</td>
                        <td class="holiday-name-cell">${escapeHtml(holiday.name)}</td>
                        <td>${statusBadge}</td>
                    </tr>
                `;
            }).join('');

            content += `
                <div class="card glass-panel holiday-card" id="market-${marketId}">
                    <div class="market-header holiday-market-header">
                        <div class="holiday-market-info">
                            <h3 class="holiday-market-name">${escapeHtml(market.name)}</h3>
                            <div class="holiday-market-meta">
                                <img class="market-item-flag holiday-flag-small" src="${getFlagUrl(market.countryCode, 80)}" alt="${escapeHtml(market.country)}" />
                                <div class="holiday-market-code">${escapeHtml(market.code)}</div>
                            </div>
                        </div>
                        ${renderStatusBadge(market.id, year)}
                    </div>
                    <div class="table-responsive">
                        <table class="dst-table holidays-table compact-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Holiday</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }
    }

    return { nav, content };
}
