
import './style.css';
import { loadMarketsConfig } from './markets';
import { loadHolidaysConfig, getMarketHolidays } from './holidays';
import type { Market } from './types';
import { getGMTOffset } from './timezone';
import { REGIONS, getFlagUrl } from './constants';
import { escapeHtml } from './htmlUtils';

const YEAR = 2027;

type UpdateStatus = 'confirmed' | 'partial' | 'pending';

// Whether each market's official exchange has published its full 2027 holiday
// calendar yet. Sourced from docs/holiday-calendar-sources.md — update both
// together when an exchange publishes (or a previously-published date turns
// out to need revision).
const UPDATE_STATUS_2027: Partial<Record<string, UpdateStatus>> = {
    nyse: 'confirmed',
    xetra: 'confirmed',
    six: 'confirmed',
    gpw: 'confirmed',
    tse: 'confirmed',
    nzx: 'partial',
};

function getUpdateStatus(marketId: string): UpdateStatus {
    return UPDATE_STATUS_2027[marketId] ?? 'pending';
}

function renderStatusBadge(status: UpdateStatus): string {
    if (status === 'confirmed') {
        return '<span class="badge badge-confirmed">Fully Updated</span>';
    }
    if (status === 'partial') {
        return '<span class="badge badge-pending">Partially Updated</span>';
    }
    return '<span class="badge badge-pending">Awaiting Official Dates</span>';
}

// ============ Render Logic ============
function renderHolidaysTable(markets: Market[]): void {
    const container = document.getElementById('holidays-container');
    if (!container) return;

    const regions = REGIONS;

    // Render navigation
    const navContainer = document.getElementById('holidays-nav');
    if (navContainer) {
        let navHtml = '';
        regions.forEach(region => {
            const regionMarkets = markets
                .filter(m => m.region === region)
                .sort((a, b) => {
                    const offsetA = getGMTOffset(a.timezone);
                    const offsetB = getGMTOffset(b.timezone);
                    return offsetB - offsetA;
                });

            if (regionMarkets.length === 0) return;

            navHtml += `<div class="holidays-nav-region">${region}</div>`;
            regionMarkets.forEach(market => {
                const holidays = getMarketHolidays(market.id, YEAR);
                if (holidays.length === 0) return; // Skip if no holidays (keep sync with main content)

                const marketId = escapeHtml(market.id.toLowerCase());
                navHtml += `
                    <a href="#market-${marketId}" class="holidays-nav-link" data-market="${marketId}">
                        <img class="market-item-flag" src="${getFlagUrl(market.countryCode)}" alt="${escapeHtml(market.country)}" />
                        <span>${escapeHtml(market.name)}</span>
                    </a>
                `;
            });
        });
        navContainer.innerHTML = navHtml;
    }

    let html = '';

    regions.forEach(region => {
        const regionMarkets = markets
            .filter(m => m.region === region)
            .sort((a, b) => {
                const offsetA = getGMTOffset(a.timezone);
                const offsetB = getGMTOffset(b.timezone);
                return offsetB - offsetA;
            });

        if (regionMarkets.length === 0) return;

        const regionId = region.toLowerCase().replace(/\s+/g, '-');
        html += `<h2 class="dst-region-title holiday-region-title" id="region-${regionId}">${region}</h2>`;

        regionMarkets.forEach(market => {
            const holidays = getMarketHolidays(market.id, YEAR);
            if (holidays.length === 0) return;

            const marketId = escapeHtml(market.id.toLowerCase());
            const status = getUpdateStatus(market.id);

            html += `
                <div class="card glass-panel holiday-card" id="market-${marketId}">
                    <div class="market-header holiday-market-header">
                        <div class="holiday-market-info">
                            <h3 class="holiday-market-name">${escapeHtml(market.name)}</h3>
                            <div class="holiday-market-meta">
                                <img class="market-item-flag holiday-flag-small" src="${getFlagUrl(market.countryCode, 80)}" alt="${escapeHtml(market.country)}" />
                                <div class="holiday-market-code">${escapeHtml(market.code)}</div>
                            </div>
                        </div>
                        ${renderStatusBadge(status)}
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
            `;

            holidays.forEach(holiday => {
                // Parse date as local date, not UTC
                const [year, month, day] = holiday.date.split('-').map(Number);
                const date = new Date(year, month - 1, day);

                const formattedDate = date.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                });

                let statusBadge = '';
                if (holiday.status === 'closed') {
                    statusBadge = '<span class="badge badge-neutral">Closed</span>';
                } else if (holiday.status === 'early-close') {
                    statusBadge = `<span class="badge badge-active">Early Close<br><span class="badge-close-time">${escapeHtml(holiday.closeTime || '')}</span></span>`;
                }

                html += `
                    <tr>
                        <td class="time-cell holiday-date-cell">${formattedDate}</td>
                        <td class="holiday-name-cell">${escapeHtml(holiday.name)}</td>
                        <td>${statusBadge}</td>
                    </tr>
                `;
            });

            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        });
    });

    container.innerHTML = html;
}

// ============ Init ============
async function init(): Promise<void> {
    await loadHolidaysConfig();
    const markets = await loadMarketsConfig();
    renderHolidaysTable(markets);

    // Setup smooth scrolling and active link highlighting
    setupScrollBehavior();
}

function setupScrollBehavior(): void {
    // Smooth scroll for navigation links
    document.querySelectorAll('.holidays-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = (link as HTMLAnchorElement).getAttribute('href');
            if (targetId) {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    });

    // Highlight active section on scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                if (id) {
                    const marketId = id.replace('market-', '');
                    document.querySelectorAll('.holidays-nav-link').forEach(link => {
                        link.classList.remove('active');
                    });
                    const activeLink = document.querySelector(`.holidays-nav-link[data-market="${marketId}"]`);
                    if (activeLink) {
                        activeLink.classList.add('active');
                    }
                }
            }
        });
    }, { threshold: 0.3, rootMargin: '-100px 0px -50% 0px' });

    // Observe all market cards
    document.querySelectorAll('.card.glass-panel[id^="market-"]').forEach(card => {
        observer.observe(card);
    });
}

document.addEventListener('DOMContentLoaded', init);
