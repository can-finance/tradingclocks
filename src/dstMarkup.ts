/**
 * DST transition table markup.
 *
 * Pure string building with no DOM or network access, so the same code runs in
 * the browser and in the build-time prerender (see scripts/prerender.ts).
 */

import type { Market } from './types';
import { getUniqueMarketsPerCountry } from './markets';
import { getGMTOffset } from './timezone';
import { formatDstDate } from './dateUtils';
import { REGIONS, getFlagUrl } from './constants';
import { escapeHtml } from './htmlUtils';

/**
 * Build the DST transition tables, one per region, keyed by country rather than
 * market so the US isn't listed once per exchange.
 */
export function buildDstMarkup(markets: Market[]): string {
    const countries = getUniqueMarketsPerCountry(markets);
    let html = '';

    for (const region of REGIONS) {
        const regionCountries = countries
            .filter(m => m.region === region)
            .sort((a, b) => getGMTOffset(b.timezone) - getGMTOffset(a.timezone));

        if (regionCountries.length === 0) continue;

        const rows = regionCountries.map(market => {
            const status = market.dstStart && market.dstEnd ? 'Observes DST' : 'No DST';

            return `
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
        }).join('');

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
                ${rows}
            </tbody>
        `;
        html += `</table></div>`;
    }

    return html;
}
