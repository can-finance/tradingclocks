
import './style.css';
import { loadMarketsConfig } from './markets';
import { loadHolidaysConfig, getMarketHolidays } from './holidays';
import type { Market } from './types';
import { getGMTOffset } from './timezone';

// ============ Theme Logic (Shared) ============
function initTheme(): void {
    const savedTheme = localStorage.getItem('trading-clocks-theme');
    const isDark = savedTheme === 'dark';
    document.documentElement.classList.toggle('dark-mode', isDark);
}

// ============ Render Logic ============
function renderHolidaysTable(markets: Market[]): void {
    const container = document.getElementById('holidays-container');
    if (!container) return;

    const year = 2026;
    const regions = ['Asia-Pacific', 'Europe', 'Americas'];

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
                const holidays = getMarketHolidays(market.id, year);
                if (holidays.length === 0) return; // Skip if no holidays (keep sync with main content)

                const marketId = market.id.toLowerCase();
                navHtml += `
                    <a href="#market-${marketId}" class="holidays-nav-link" data-market="${marketId}">
                        <img class="market-item-flag" src="https://flagcdn.com/w40/${market.countryCode.toLowerCase()}.png" alt="${market.country}" />
                        <span>${market.name}</span>
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
            const holidays = getMarketHolidays(market.id, year);
            if (holidays.length === 0) return;

            const countryCode = market.countryCode.toLowerCase();
            const marketId = market.id.toLowerCase();

            html += `
                <div class="card glass-panel holiday-card" id="market-${marketId}">
                    <div class="market-header holiday-market-header">
                        <div class="holiday-market-info">
                            <h3 class="holiday-market-name">${market.name}</h3>
                            <div class="holiday-market-meta">
                                <img class="market-item-flag holiday-flag-small" src="https://flagcdn.com/w80/${countryCode}.png" alt="${market.country}" />
                                <div class="holiday-market-code">${market.code}</div>
                            </div>
                        </div>
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
                    statusBadge = `<span class="badge badge-active">Early Close<br><span class="badge-close-time">${holiday.closeTime || ''}</span></span>`;
                }

                html += `
                    <tr>
                        <td class="time-cell holiday-date-cell">${formattedDate}</td>
                        <td class="holiday-name-cell">${holiday.name}</td>
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
    initTheme();

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
