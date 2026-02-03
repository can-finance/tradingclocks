/**
 * LocalStorage utilities for persisting user preferences
 */

import type { TimeOverride, TimeOverrides } from './types';

const STORAGE_KEYS = {
    SELECTED_MARKETS: 'tradingClocks_selectedMarkets',
    TIME_OVERRIDES: 'tradingClocks_timeOverrides'
} as const;

/**
 * Get selected market IDs from storage
 */
export function getSelectedMarkets(defaultMarkets: string[]): string[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.SELECTED_MARKETS);
        if (stored) {
            return JSON.parse(stored) as string[];
        }
    } catch (e) {
        console.warn('Error reading selected markets from storage:', e);
    }
    return defaultMarkets;
}

/**
 * Save selected market IDs to storage
 */
export function saveSelectedMarkets(marketIds: string[]): void {
    try {
        localStorage.setItem(STORAGE_KEYS.SELECTED_MARKETS, JSON.stringify(marketIds));
    } catch (e) {
        console.warn('Error saving selected markets to storage:', e);
    }
}

/**
 * Get time overrides from storage
 */
export function getTimeOverrides(): TimeOverrides {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.TIME_OVERRIDES);
        if (stored) {
            return JSON.parse(stored) as TimeOverrides;
        }
    } catch (e) {
        console.warn('Error reading time overrides from storage:', e);
    }
    return {};
}

/**
 * Save time override for a specific market
 */
export function saveTimeOverride(marketId: string, override: TimeOverride | null): void {
    try {
        const overrides = getTimeOverrides();
        if (override === null) {
            delete overrides[marketId];
        } else {
            overrides[marketId] = override;
        }
        localStorage.setItem(STORAGE_KEYS.TIME_OVERRIDES, JSON.stringify(overrides));
    } catch (e) {
        console.warn('Error saving time override to storage:', e);
    }
}

/**
 * Clear time override for a specific market
 */
export function clearTimeOverride(marketId: string): void {
    saveTimeOverride(marketId, null);
}
