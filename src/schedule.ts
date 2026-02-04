
import './style.css';
import { loadMarketsConfig } from './markets';
import type { Market } from './types';
import { formatTimeInTimezone, getUserTimezone } from './timezone';
import { timeService } from './timeService';
import { getNextWeekday, getDateFromIsoInTz } from './dateUtils';
import { REGIONS } from './constants';


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

    // Group by unique country (one market per country)
    const uniqueCountries = new Map<string, Market>();
    markets.forEach(m => {
        if (!uniqueCountries.has(m.country)) {
            uniqueCountries.set(m.country, m);
        }
    });
    const countries = Array.from(uniqueCountries.values());

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
                    <th>Lunch Break</th>
                    <th>Duration</th>
                </tr>
            </thead>
            <tbody>
        `;


        regionCountries.forEach(market => {
            const countryCode = market.countryCode.toLowerCase();

            // Format target date as YYYY-MM-DD
            const yyyy = targetDate.getFullYear();
            const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
            const dd = String(targetDate.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;

            // Create Date objects for open/close in market timezone
            const openDate = getDateFromIsoInTz(`${dateStr}T${market.openTime}:00`, market.timezone);
            const closeDate = getDateFromIsoInTz(`${dateStr}T${market.closeTime}:00`, market.timezone);

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

                // Subtract lunch duration
                const lunchDuration = lunchEnd.getTime() - lunchStart.getTime();
                diffMs -= lunchDuration;

                // Format lunch times
                const lunchStartFmt = formatTimeInTimezone(lunchStart, userTz);
                const lunchEndFmt = formatTimeInTimezone(lunchEnd, userTz);

                lunchHtml = `${lunchStartFmt.time} <span class="tz-abbrev">${lunchStartFmt.tzAbbrev}</span> - ${lunchEndFmt.time} <span class="tz-abbrev">${lunchEndFmt.tzAbbrev}</span>`;
            }

            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

            html += `
                <tr>
                    <td class="dst-country-cell">
                        <img class="market-item-flag" src="https://flagcdn.com/w40/${countryCode}.png" alt="${market.country}" />
                        <span>${market.country}</span>
                    </td>
                    <td class="time-cell">${openFmt.time} <span class="tz-abbrev">${openFmt.tzAbbrev}</span></td>
                    <td class="time-cell">${closeFmt.time} <span class="tz-abbrev">${closeFmt.tzAbbrev}</span></td>
                    <td class="lunch-cell">${lunchHtml}</td>
                    <td class="duration-cell">${hours}h ${mins > 0 ? mins + 'm' : ''}</td>
                </tr>
            `;
        });

        html += `</tbody></table></div>`;
    });

    container.innerHTML = html;
}

// ============ Init ============
async function init(): Promise<void> {
    const markets = await loadMarketsConfig();
    renderScheduleTable(markets);
}

document.addEventListener('DOMContentLoaded', init);
