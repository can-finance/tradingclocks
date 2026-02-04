
import './style.css';
import { loadMarketsConfig } from './markets';
import type { Market } from './types';

import { getGMTOffset } from './timezone';

// ============ Theme Logic (Shared) ============
function initTheme(): void {
    const savedTheme = localStorage.getItem('trading-clocks-theme');
    const isDark = savedTheme === 'dark';
    document.documentElement.classList.toggle('dark-mode', isDark);
}

// ============ Render Logic ============
function renderDSTTable(markets: Market[]): void {
    const container = document.getElementById('dst-table-container');
    if (!container) return;

    // Group by unique country to avoid duplicates (e.g. NYSE/NASDAQ/Chicago all US)
    const uniqueCountries = new Map<string, Market>();
    markets.forEach(m => {
        if (!uniqueCountries.has(m.country)) {
            uniqueCountries.set(m.country, m);
        }
    });

    const countries = Array.from(uniqueCountries.values());

    // Group by region
    const regions = ['Asia-Pacific', 'Europe', 'Americas'];
    let html = '';

    regions.forEach(region => {
        const regionCountries = countries
            .filter(m => m.region === region)
            .sort((a, b) => { // Sort by GMT offset descending (East to West)
                const offsetA = getGMTOffset(a.timezone);
                const offsetB = getGMTOffset(b.timezone);
                return offsetB - offsetA;
            });

        if (regionCountries.length === 0) return;
        if (regionCountries.length === 0) return;

        html += `<h2 class="dst-region-title">${region}</h2>`;
        html += `<div class="table-responsive">`;
        html += `<table class="dst-table">`;
        html += `
            <thead>
                <tr>
                    <th>Country</th>
                    <th>Standard Time Starts<br><span class="sub-header">(Clocks Fall Back)</span></th>
                    <th>Daylight Time Starts<br><span class="sub-header">(Clocks Spring Forward)</span></th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
        `;

        regionCountries.forEach(market => {
            const countryCode = market.countryCode.toLowerCase();

            // Determine crude status
            let status = 'Standard Time';
            if (market.dstStart && market.dstEnd) {
                status = 'Observes DST';
            } else {
                status = 'No DST';
            }

            html += `
                <tr>
                    <td>
                        <div class="dst-country-cell">
                            <img class="market-item-flag" src="https://flagcdn.com/w40/${countryCode}.png" alt="${market.country}" />
                            <span>${market.country}</span>
                        </div>
                    </td>
                    <td>${market.dstEnd ? formatDstDate(market.dstEnd) : '-'}</td>
                    <td>${market.dstStart ? formatDstDate(market.dstStart) : '-'}</td>
                    <td><span class="badge ${status === 'No DST' ? 'badge-neutral' : 'badge-active'}">${status}</span></td>
                </tr>
            `;
        });

        html += `</tbody></table></div>`;
    });

    container.innerHTML = html;
}

function formatDstDate(dateStr: string): string {
    if (!dateStr) return '-';
    // dateStr is YYYY-MM-DD
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ============ Init ============
async function init(): Promise<void> {
    initTheme();

    const markets = await loadMarketsConfig();
    renderDSTTable(markets);
}

document.addEventListener('DOMContentLoaded', init);
