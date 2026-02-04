/**
 * Market Editor Page Logic
 * Handles loading, displaying, and editing market trading hours
 */

import type { Market, TimeOverride, TimeOverrides } from './types';
import { getTimeOverrides, saveTimeOverride, clearTimeOverride } from './storage';

// State
let markets: Market[] = [];
let originalMarkets: Map<string, Market> = new Map();
let pendingChanges: Map<string, TimeOverride> = new Map();

/**
 * Initialize the editor
 */
async function init(): Promise<void> {
    await loadMarkets();
    renderTable();
    setupEventListeners();
}

/**
 * Load markets from config file
 */
async function loadMarkets(): Promise<void> {
    try {
        const response = await fetch(`${import.meta.env.BASE_URL}markets-config.json`);
        if (!response.ok) {
            throw new Error(`Failed to load config: ${response.status}`);
        }
        const config = await response.json();
        markets = config.markets as Market[];

        // Store original market data for comparison
        for (const market of markets) {
            originalMarkets.set(market.id, { ...market });
        }
    } catch (error) {
        console.error('Error loading markets:', error);
        showToast('Failed to load markets', false);
    }
}

/**
 * Get GMT offset for a timezone in hours
 */
function getGMTOffset(timezone: string): number {
    try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            timeZoneName: 'shortOffset'
        });
        const parts = formatter.formatToParts(now);
        const tzPart = parts.find(p => p.type === 'timeZoneName');
        if (tzPart) {
            // Parse "GMT+9" or "GMT-5" format
            const match = tzPart.value.match(/GMT([+-]?)(\d+)?(?::(\d+))?/);
            if (match) {
                const sign = match[1] === '-' ? -1 : 1;
                const hours = parseInt(match[2] || '0', 10);
                const minutes = parseInt(match[3] || '0', 10);
                return sign * (hours + minutes / 60);
            }
        }
    } catch (e) {
        console.warn(`Error getting offset for ${timezone}:`, e);
    }
    return 0;
}

/**
 * Format GMT offset as a string like "GMT+9" or "GMT-5"
 */
function formatGMTOffset(offset: number): string {
    const sign = offset >= 0 ? '+' : '';
    const hours = Math.floor(Math.abs(offset));
    const minutes = Math.round((Math.abs(offset) - hours) * 60);
    if (minutes === 0) {
        return `GMT${sign}${offset}`;
    }
    return `GMT${sign}${Math.floor(offset)}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Get all markets sorted by GMT offset (highest/easternmost first)
 */
function getMarketsSortedByOffset(): Market[] {
    return [...markets].sort((a, b) => {
        const offsetA = getGMTOffset(a.timezone);
        const offsetB = getGMTOffset(b.timezone);
        return offsetB - offsetA; // Descending: Asia-Pacific first, Americas last
    });
}

/**
 * Render the markets table
 */
function renderTable(): void {
    const container = document.getElementById('markets-table-container');
    if (!container) return;

    const savedOverrides = getTimeOverrides();
    const sortedMarkets = getMarketsSortedByOffset();

    const html = `
        <table class="dst-table editor-table">
            <thead>
                <tr>
                    <th>GMT</th>
                    <th>Country</th>
                    <th>Exchange</th>
                    <th>Open Time</th>
                    <th>Close Time</th>
                    <th>Timezone</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                ${sortedMarkets.map(market => renderMarketRow(market, savedOverrides)).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

/**
 * Render a single market row
 */
function renderMarketRow(market: Market, overrides: TimeOverrides): string {
    const override = overrides[market.id];
    const openTime = override?.openTime || market.openTime;
    const closeTime = override?.closeTime || market.closeTime;
    const hasOverride = override && (override.openTime || override.closeTime);
    const gmtOffset = formatGMTOffset(getGMTOffset(market.timezone));

    return `
        <tr data-market-id="${market.id}">
            <td class="gmt-cell">${gmtOffset}</td>
            <td>
                <div class="dst-country-cell">
                    <img class="market-item-flag" src="https://flagcdn.com/w40/${market.countryCode.toLowerCase()}.png" alt="${market.country}" />
                    <span>${market.country}</span>
                </div>
            </td>
            <td>
                <span class="exchange-name">${market.name}</span>
                <span class="exchange-code">${market.code}</span>
            </td>
            <td>
                <input 
                    type="time" 
                    class="time-input ${hasOverride ? 'modified' : ''}" 
                    data-market-id="${market.id}"
                    data-field="open"
                    data-original="${market.openTime}"
                    value="${openTime}"
                />
            </td>
            <td>
                <input 
                    type="time" 
                    class="time-input ${hasOverride ? 'modified' : ''}" 
                    data-market-id="${market.id}"
                    data-field="close"
                    data-original="${market.closeTime}"
                    value="${closeTime}"
                />
            </td>
            <td class="timezone-cell">${market.timezone}</td>
            <td class="actions-cell">
                <button 
                    class="btn-reset-row" 
                    data-market-id="${market.id}"
                    ${!hasOverride ? 'disabled' : ''}
                >
                    Reset
                </button>
            </td>
        </tr>
    `;
}
/**
 * Setup event listeners
 */
function setupEventListeners(): void {
    // Time input changes
    document.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.classList.contains('time-input')) {
            handleTimeChange(target);
        }
    });

    // Reset row button
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('btn-reset-row')) {
            const marketId = target.dataset.marketId;
            if (marketId) {
                resetMarket(marketId);
            }
        }
    });

    // Save all button
    document.getElementById('btn-save-all')?.addEventListener('click', saveAllChanges);

    // Reset all button
    document.getElementById('btn-reset-all')?.addEventListener('click', resetAllChanges);
}

/**
 * Handle time input change
 */
function handleTimeChange(input: HTMLInputElement): void {
    const marketId = input.dataset.marketId;
    const field = input.dataset.field as 'open' | 'close';
    const original = input.dataset.original;
    const value = input.value;

    if (!marketId || !field) return;

    // Track pending change
    let pending = pendingChanges.get(marketId) || { openTime: null, closeTime: null };

    if (field === 'open') {
        pending.openTime = value !== original ? value : null;
    } else {
        pending.closeTime = value !== original ? value : null;
    }

    pendingChanges.set(marketId, pending);

    // Update visual state
    const row = input.closest('tr');
    if (row) {
        const inputs = row.querySelectorAll('.time-input') as NodeListOf<HTMLInputElement>;
        const hasChanges = Array.from(inputs).some(inp => inp.value !== inp.dataset.original);

        inputs.forEach(inp => {
            inp.classList.toggle('modified', hasChanges);
        });

        const resetBtn = row.querySelector('.btn-reset-row') as HTMLButtonElement;
        if (resetBtn) {
            resetBtn.disabled = !hasChanges;
        }
    }
}

/**
 * Reset a single market to defaults
 */
function resetMarket(marketId: string): void {
    const original = originalMarkets.get(marketId);
    if (!original) return;

    // Clear from storage
    clearTimeOverride(marketId);
    pendingChanges.delete(marketId);

    // Update inputs
    const row = document.querySelector(`tr[data-market-id="${marketId}"]`);
    if (row) {
        const openInput = row.querySelector('input[data-field="open"]') as HTMLInputElement;
        const closeInput = row.querySelector('input[data-field="close"]') as HTMLInputElement;

        if (openInput) {
            openInput.value = original.openTime;
            openInput.classList.remove('modified');
        }
        if (closeInput) {
            closeInput.value = original.closeTime;
            closeInput.classList.remove('modified');
        }

        const resetBtn = row.querySelector('.btn-reset-row') as HTMLButtonElement;
        if (resetBtn) resetBtn.disabled = true;
    }

    showToast('Market reset to default times');
}

/**
 * Save all pending changes
 */
function saveAllChanges(): void {
    const rows = document.querySelectorAll('tr[data-market-id]');
    let changeCount = 0;

    rows.forEach(row => {
        const marketId = (row as HTMLElement).dataset.marketId;
        if (!marketId) return;

        const openInput = row.querySelector('input[data-field="open"]') as HTMLInputElement;
        const closeInput = row.querySelector('input[data-field="close"]') as HTMLInputElement;

        if (!openInput || !closeInput) return;

        const original = originalMarkets.get(marketId);
        if (!original) return;

        const openChanged = openInput.value !== original.openTime;
        const closeChanged = closeInput.value !== original.closeTime;

        if (openChanged || closeChanged) {
            const override: TimeOverride = {
                openTime: openChanged ? openInput.value : null,
                closeTime: closeChanged ? closeInput.value : null
            };
            saveTimeOverride(marketId, override);
            changeCount++;
        }
    });

    pendingChanges.clear();
    showToast(`Saved ${changeCount} market${changeCount !== 1 ? 's' : ''}`, true);
}

/**
 * Reset all markets to defaults
 */
function resetAllChanges(): void {
    if (!confirm('Reset all markets to their default trading hours? This will clear all your customizations.')) {
        return;
    }

    // Clear all overrides from storage
    localStorage.removeItem('tradingClocks_timeOverrides');
    pendingChanges.clear();

    // Re-render table
    renderTable();
    showToast('All markets reset to defaults');
}

/**
 * Show toast notification
 */
function showToast(message: string, success = true): void {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${success ? 'success' : ''}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Auto-hide
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
