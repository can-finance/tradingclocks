/**
 * Market hours table markup.
 *
 * Pure string building with no DOM or network access, so the same code runs in
 * the browser and in the build-time prerender (see scripts/prerender.ts).
 */

import type { Market } from './types';
import type { Holiday } from './holidays';
import { getUniqueMarketsPerCountry } from './markets';
import { formatTimeInTimezone } from './timezone';
import { getDateFromIsoInTz } from './dateUtils';
import { REGIONS, getFlagUrl } from './constants';
import { escapeHtml } from './htmlUtils';

export interface ScheduleMarkupInput {
    markets: Market[];
    /** Trading day to render, as YYYY-MM-DD. */
    targetDateStr: string;
    /**
     * Timezone to convert every market's hours into, or null to show each
     * market in its own local time. The prerender passes null: a visitor's
     * timezone is unknowable at build time, and market-local hours are the
     * evergreen fact worth putting in the served HTML.
     */
    displayTimezone: string | null;
    /**
     * Holiday lookup for the target date. The prerender passes a function
     * returning null so the baseline shows each market's regular hours rather
     * than baking one build day's closures into the page.
     */
    getHoliday: (marketId: string, dateStr: string) => Holiday | null;
}

function formatDisplayDate(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });
}

/**
 * Build the market hours tables, one per region, keyed by country rather than
 * market so the US isn't listed once per exchange.
 */
export function buildScheduleMarkup({
    markets,
    targetDateStr,
    displayTimezone,
    getHoliday,
}: ScheduleMarkupInput): string {
    const countries = getUniqueMarketsPerCountry(markets);

    const intro = displayTimezone
        ? `<p>Showing opening and closing times for <strong>${formatDisplayDate(targetDateStr)}</strong> converted to your local time (<strong>${escapeHtml(displayTimezone)}</strong>).</p>`
        : `<p>Regular opening and closing times for each market, shown in that market's own local time.</p>`;

    let html = `
        <div class="schedule-intro">
            ${intro}
        </div>
    `;

    for (const region of REGIONS) {
        const regionCountries = countries.filter(m => m.region === region);
        if (regionCountries.length === 0) continue;

        const rows = regionCountries.map(market => {
            const countryCell = `
                    <td><div class="dst-country-cell">
                        <img class="market-item-flag" src="${getFlagUrl(market.countryCode)}" alt="${escapeHtml(market.country)}" />
                        <span>${escapeHtml(market.country)}</span>
                    </div></td>`;

            const holiday = getHoliday(market.id, targetDateStr);

            if (holiday && holiday.status === 'closed') {
                return `
                <tr>
                    ${countryCell}
                    <td class="lunch-cell" colspan="4">Closed — ${escapeHtml(holiday.name)}</td>
                </tr>
                `;
            }

            // Apply early-close (and rare open-time) holiday overrides
            const openTime = (holiday && holiday.openTime) || market.openTime;
            const closeTime = (holiday && holiday.closeTime) || market.closeTime;

            const openDate = getDateFromIsoInTz(`${targetDateStr}T${openTime}:00`, market.timezone);
            const closeDate = getDateFromIsoInTz(`${targetDateStr}T${closeTime}:00`, market.timezone);

            const displayTz = displayTimezone ?? market.timezone;
            const openFmt = formatTimeInTimezone(openDate, displayTz);
            const closeFmt = formatTimeInTimezone(closeDate, displayTz);

            let diffMs = closeDate.getTime() - openDate.getTime();
            let lunchHtml = '-';

            if (market.lunchStart && market.lunchEnd) {
                const lunchStart = getDateFromIsoInTz(`${targetDateStr}T${market.lunchStart}:00`, market.timezone);
                const lunchEnd = getDateFromIsoInTz(`${targetDateStr}T${market.lunchEnd}:00`, market.timezone);

                if (closeDate.getTime() <= lunchStart.getTime()) {
                    // Early close before lunch even starts — no lunch break
                } else if (closeDate.getTime() < lunchEnd.getTime()) {
                    // Early close during lunch — session effectively ends at lunch start
                    diffMs = lunchStart.getTime() - openDate.getTime();
                } else {
                    diffMs -= lunchEnd.getTime() - lunchStart.getTime();

                    const lunchStartFmt = formatTimeInTimezone(lunchStart, displayTz);
                    const lunchEndFmt = formatTimeInTimezone(lunchEnd, displayTz);
                    lunchHtml = `${lunchStartFmt.time} <span class="tz-abbrev">${lunchStartFmt.tzAbbrev}</span> - ${lunchEndFmt.time} <span class="tz-abbrev">${lunchEndFmt.tzAbbrev}</span>`;
                }
            }

            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

            const earlyCloseBadge = holiday && holiday.status === 'early-close'
                ? ` <span class="badge badge-active" title="${escapeHtml(holiday.name)}">Early close</span>`
                : '';

            return `
                <tr>
                    ${countryCell}
                    <td class="time-cell">${openFmt.time} <span class="tz-abbrev">${openFmt.tzAbbrev}</span></td>
                    <td class="time-cell">${closeFmt.time} <span class="tz-abbrev">${closeFmt.tzAbbrev}</span>${earlyCloseBadge}</td>
                    <td class="duration-cell">${hours}h ${mins > 0 ? mins + 'm' : ''}</td>
                    <td class="lunch-cell">${lunchHtml}</td>
                </tr>
            `;
        }).join('');

        html += `<h2 class="dst-region-title">${region}</h2>`;
        html += `<div class="table-responsive"><table class="dst-table">`;
        html += `
            <thead>
                <tr>
                    <th>Country</th>
                    <th>Opens <span class="sub-header">(Local Time)</span></th>
                    <th>Closes <span class="sub-header">(Local Time)</span></th>
                    <th>Duration</th>
                    <th>Lunch Break</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        `;
        html += `</table></div>`;
    }

    return html;
}
