/**
 * Application constants
 */

export const STORAGE_KEYS = {
    THEME: 'trading-clocks-theme',
    SIDEBAR: 'trading-clocks-sidebar',
    SELECTED_MARKETS: 'tradingClocks_selectedMarkets',
    TIME_OVERRIDES: 'tradingClocks_timeOverrides'
} as const;

export const REGIONS = ['Asia-Pacific', 'Europe', 'Americas'] as const;
export type Region = typeof REGIONS[number];

export const TIMING = {
    UPDATE_INTERVAL: 1000, // 1 second
    OPENING_SOON_THRESHOLD: 30 * 60 * 1000, // 30 minutes
    CLOSING_SOON_THRESHOLD: 30 * 60 * 1000  // 30 minutes
} as const;

/**
 * Flag image URL from flagcdn.com (size = image width in px)
 */
export function getFlagUrl(countryCode: string, size: 40 | 80 = 40): string {
    return `https://flagcdn.com/w${size}/${countryCode.toLowerCase()}.png`;
}
