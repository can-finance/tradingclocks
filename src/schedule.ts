
import './style.css';
import { loadMarketsConfig, getUniqueMarketsPerCountry } from './markets';
import { loadHolidaysConfig, getMarketHolidays } from './holidays';
import type { Market } from './types';
import { formatTimeInTimezone, getUserTimezone } from './timezone';
import { timeService } from './timeService';
import { getNextWeekday, getDateFromIsoInTz } from './dateUtils';
import { REGIONS, getFlagUrl } from './constants';
import { escapeHtml } from './htmlUtils';


// ============ Rendering ============

function renderScheduleTable(markets: Market[]): void {
    const container = document.getElementById('schedule-container');
    if (!container) return;

    const now = timeService.getNow();
    const targetDate = getNextWeekday(now);
    const userTz = getUserTimezone();
    const displayDate = targetDate.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric'
    });

    // Format target date as YYYY-MM-DD (same date for every market)
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
    const dd = String(targetDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    // Group by unique country (one market per country)
    const countries = getUniqueMarketsPerCountry(markets);

    // Build HTML
    let html = `
        <div class="schedule-intro">
            <p>Showing opening and closing times for <strong>${displayDate}</strong> converted to your local time (<strong>${userTz}</strong>).</p>
        </div>
    `;

    const regions = REGIONS;

    regions.forEach(region => {
        const regionCountries = countries.filter(m => m.region === region);
        if (regionCountries.length === 0) return;

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
        `;


        regionCountries.forEach(market => {
            const countryCell = `
                    <td><div class="dst-country-cell">
                        <img class="market-item-flag" src="${getFlagUrl(market.countryCode)}" alt="${escapeHtml(market.country)}" />
                        <span>${escapeHtml(market.country)}</span>
                    </div></td>`;

            // Check if the target date is a holiday for this market
            const holiday = getMarketHolidays(market.id, targetDate.getFullYear())
                .find(h => h.date === dateStr);

            if (holiday && holiday.status === 'closed') {
                html += `
                <tr>
                    ${countryCell}
                    <td class="lunch-cell" colspan="4">Closed — ${escapeHtml(holiday.name)}</td>
                </tr>
                `;
                return;
            }

            // Apply early-close (and rare open-time) holiday overrides
            const openTime = (holiday && holiday.openTime) || market.openTime;
            const closeTime = (holiday && holiday.closeTime) || market.closeTime;

            // Create Date objects for open/close in market timezone
            const openDate = getDateFromIsoInTz(`${dateStr}T${openTime}:00`, market.timezone);
            const closeDate = getDateFromIsoInTz(`${dateStr}T${closeTime}:00`, market.timezone);

            // Format to user's local time
            const openFmt = formatTimeInTimezone(openDate, userTz);
            const closeFmt = formatTimeInTimezone(closeDate, userTz);

            // Calculate duration
            let diffMs = closeDate.getTime() - openDate.getTime();
            let lunchHtml = '-';

            // Handle Lunch Break
            if (market.lunchStart && market.lunchEnd) {
                const lunchStart = getDateFromIsoInTz(`${dateStr}T${market.lunchStart}:00`, market.timezone);
                const lunchEnd = getDateFromIsoInTz(`${dateStr}T${market.lunchEnd}:00`, market.timezone);

                if (closeDate.getTime() <= lunchStart.getTime()) {
                    // Early close before lunch even starts — no lunch break
                } else if (closeDate.getTime() < lunchEnd.getTime()) {
                    // Early close during lunch — session effectively ends at lunch start
                    diffMs = lunchStart.getTime() - openDate.getTime();
                } else {
                    // Subtract lunch duration
                    const lunchDuration = lunchEnd.getTime() - lunchStart.getTime();
                    diffMs -= lunchDuration;

                    // Format lunch times
                    const lunchStartFmt = formatTimeInTimezone(lunchStart, userTz);
                    const lunchEndFmt = formatTimeInTimezone(lunchEnd, userTz);

                    lunchHtml = `${lunchStartFmt.time} <span class="tz-abbrev">${lunchStartFmt.tzAbbrev}</span> - ${lunchEndFmt.time} <span class="tz-abbrev">${lunchEndFmt.tzAbbrev}</span>`;
                }
            }

            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

            const earlyCloseBadge = holiday && holiday.status === 'early-close'
                ? ` <span class="badge badge-active" title="${escapeHtml(holiday.name)}">Early close</span>`
                : '';

            html += `
                <tr>
                    ${countryCell}
                    <td class="time-cell">${openFmt.time} <span class="tz-abbrev">${openFmt.tzAbbrev}</span></td>
                    <td class="time-cell">${closeFmt.time} <span class="tz-abbrev">${closeFmt.tzAbbrev}</span>${earlyCloseBadge}</td>
                    <td class="duration-cell">${hours}h ${mins > 0 ? mins + 'm' : ''}</td>
                    <td class="lunch-cell">${lunchHtml}</td>
                </tr>
            `;
        });

        html += `</tbody></table></div>`;
    });

    container.innerHTML = html;
}

// ============ Init ============
async function init(): Promise<void> {
    const [markets] = await Promise.all([loadMarketsConfig(), loadHolidaysConfig()]);
    renderScheduleTable(markets);
}

document.addEventListener('DOMContentLoaded', init);
