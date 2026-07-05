/**
 * LocalStorage utilities for persisting user preferences
 */

import type { TimeOverride, TimeOverrides } from './types';
import { STORAGE_KEYS } from './constants';

/**
 * Get selected market IDs from storage
 */
export function getSelectedMarkets(defaultMarkets: string[]): string[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.SELECTED_MARKETS);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                return parsed.filter((id): id is string => typeof id === 'string');
            }
            console.warn('Ignoring malformed selected markets in storage:', parsed);
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
            const parsed = JSON.parse(stored);
            if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed as TimeOverrides;
            }
            console.warn('Ignoring malformed time overrides in storage:', parsed);
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

/**
 * Clear all saved time overrides
 */
export function clearAllTimeOverrides(): void {
    try {
        localStorage.removeItem(STORAGE_KEYS.TIME_OVERRIDES);
    } catch (e) {
        console.warn('Error clearing time overrides from storage:', e);
    }
}
