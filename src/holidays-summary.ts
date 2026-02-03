
import './style.css';
import { loadMarketsConfig } from './markets';
import { loadHolidaysConfig, getMarketHolidays } from './holidays';
import type { Market } from './types';

// ============ Theme Logic (Shared) ============
function initTheme(): void {
    const savedTheme = localStorage.getItem('trading-clocks-theme');
    const isDark = savedTheme === 'dark';
    document.body.classList.toggle('dark-mode', isDark);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = isDark ? '☀️' : '🌙';
}

function toggleTheme(): void {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('trading-clocks-theme', isDark ? 'dark' : 'light');
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = isDark ? '☀️' : '🌙';
}

// ============ Render Logic ============
function renderHolidaysTable(markets: Market[]): void {
    const container = document.getElementById('holidays-container');
    if (!container) return;

    const year = 2026;
    const regions = ['Americas', 'Europe', 'Asia-Pacific'];

    // Render navigation
    const navContainer = document.getElementById('holidays-nav');
    if (navContainer) {
        let navHtml = '';
        regions.forEach(region => {
            const regionMarkets = markets.filter(m => m.region === region);
            if (regionMarkets.length === 0) return;

            navHtml += `<div class="holidays-nav-region">${region}</div>`;
            regionMarkets.forEach(market => {
                const marketId = market.id.toLowerCase();
                navHtml += `
                    <a href="#market-${marketId}" class="holidays-nav-link" data-market="${marketId}">
                        <img class="market-item-flag" src="https://flagcdn.com/16x12/${market.countryCode.toLowerCase()}.png" alt="${market.country}" />
                        <span>${market.name}</span>
                    </a>
                `;
            });
        });
        navContainer.innerHTML = navHtml;
    }

    let html = '';

    regions.forEach(region => {
        const regionMarkets = markets.filter(m => m.region === region);
        if (regionMarkets.length === 0) return;

        const regionId = region.toLowerCase().replace(/\s+/g, '-');
        html += `<h2 class="dst-region-title" id="region-${regionId}" style="margin-bottom: 1rem; margin-top: 2rem; font-size: 1.25rem;">${region}</h2>`;

        regionMarkets.forEach(market => {
            const holidays = getMarketHolidays(market.id, year);
            if (holidays.length === 0) return;

            const countryCode = market.countryCode.toLowerCase();
            const marketId = market.id.toLowerCase();

            html += `
                <div class="card glass-panel" id="market-${marketId}" style="margin-bottom: 1.25rem; padding: 1.25rem;">
                    <div class="market-header" style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-subtle);">
                        <img class="market-item-flag" src="https://flagcdn.com/24x18/${countryCode}.png" alt="${market.country}" style="width: 24px; height: 18px;" />
                        <div>
                            <h3 style="margin: 0; font-size: 1rem;">${market.name}</h3>
                            <div style="font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono);">${market.code}</div>
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table class="dst-table holidays-table">
                            <thead>
                                <tr>
                                    <th style="width: 25%;">Date</th>
                                    <th style="width: 50%;">Holiday</th>
                                    <th style="width: 25%;">Status</th>
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
                    statusBadge = `<span class="badge badge-active">Early Close<br><span style="font-size: 0.65rem;">${holiday.closeTime || ''}</span></span>`;
                }

                html += `
                    <tr>
                        <td style="font-family: var(--font-mono); font-size: 0.85rem;">${formattedDate}</td>
                        <td style="font-weight: 500;">${holiday.name}</td>
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

    document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

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
