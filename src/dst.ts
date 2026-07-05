
import './style.css';
import { loadMarketsConfig, getUniqueMarketsPerCountry } from './markets';
import type { Market } from './types';
import { getGMTOffset } from './timezone';
import { formatDstDate } from './dateUtils';
import { REGIONS, getFlagUrl } from './constants';
import { escapeHtml } from './htmlUtils';

// ============ Render Logic ============
function renderDSTTable(markets: Market[]): void {
    const container = document.getElementById('dst-table-container');
    if (!container) return;

    // Group by unique country to avoid duplicates (e.g. NYSE/NASDAQ/Chicago all US)
    const countries = getUniqueMarketsPerCountry(markets);

    // Group by region
    const regions = REGIONS;
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
            // Determine crude status
            const status = market.dstStart && market.dstEnd ? 'Observes DST' : 'No DST';

            html += `
                <tr>
                    <td>
                        <div class="dst-country-cell">
                            <img class="market-item-flag" src="${getFlagUrl(market.countryCode)}" alt="${escapeHtml(market.country)}" />
                            <span>${escapeHtml(market.country)}</span>
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


// ============ Init ============
async function init(): Promise<void> {
    const markets = await loadMarketsConfig();
    renderDSTTable(markets);
}

document.addEventListener('DOMContentLoaded', init);
