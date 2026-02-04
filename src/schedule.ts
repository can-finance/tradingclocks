
import './style.css';
import { loadMarketsConfig } from './markets';
import type { Market } from './types';
import { formatTimeInTimezone, getUserTimezone } from './timezone';
import { timeService } from './timeService';

// ============ Theme Logic (Shared) ============
function initTheme(): void {
    const savedTheme = localStorage.getItem('trading-clocks-theme');
    const isDark = savedTheme === 'dark';
    document.documentElement.classList.toggle('dark-mode', isDark);
}

// ============ Date Utilities ============

/**
 * Returns the next weekday (Mon-Fri) after the given date.
 */
function getNextWeekday(date: Date): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + 1); // Start with tomorrow
    while (d.getDay() === 0 || d.getDay() === 6) {
        d.setDate(d.getDate() + 1);
    }
    return d;
}

/**
 * Converts an ISO datetime string (e.g., "2026-02-05T09:30:00") interpreted
 * as local time in the specified timezone into a UTC Date object.
 */
function getDateFromIsoInTz(isoStr: string, timezone: string): Date {
    // Treat isoStr as UTC first to get a reference point
    const utcAssume = new Date(isoStr + 'Z');

    // Format this UTC time as if it were in the target timezone
    const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit', minute: '2-digit',
        hour12: false
    });

    const parts = fmt.formatToParts(utcAssume);
    const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0');

    // Calculate offset: what time does the target TZ show vs UTC?
    const targetH = utcAssume.getUTCHours();
    const targetM = utcAssume.getUTCMinutes();
    const actualH = getPart('hour');
    const actualM = getPart('minute');

    // Offset in minutes (positive = ahead of UTC)
    let diffMins = (actualH * 60 + actualM) - (targetH * 60 + targetM);
    if (diffMins > 720) diffMins -= 1440;
    if (diffMins < -720) diffMins += 1440;

    // Adjust to get the correct UTC time for the given local time
    return new Date(utcAssume.getTime() - diffMins * 60000);
}

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

    const regions = ['Asia-Pacific', 'Europe', 'Americas'];

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
            const diffMs = closeDate.getTime() - openDate.getTime();
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

            html += `
                <tr>
                    <td class="dst-country-cell">
                        <img class="market-item-flag" src="https://flagcdn.com/w40/${countryCode}.png" alt="${market.country}" />
                        <span>${market.country}</span>
                    </td>
                    <td style="font-family: var(--font-mono); font-weight: 500;">${openFmt.time} <span style="font-size:0.75em; color:var(--text-muted)">${openFmt.tzAbbrev}</span></td>
                    <td style="font-family: var(--font-mono); font-weight: 500;">${closeFmt.time} <span style="font-size:0.75em; color:var(--text-muted)">${closeFmt.tzAbbrev}</span></td>
                    <td>${hours}h ${mins > 0 ? mins + 'm' : ''}</td>
                </tr>
            `;
        });

        html += `</tbody></table></div>`;
    });

    container.innerHTML = html;
}

// ============ Init ============
async function init(): Promise<void> {
    initTheme();
    const markets = await loadMarketsConfig();
    renderScheduleTable(markets);
}

document.addEventListener('DOMContentLoaded', init);
