/**
 * MSCI Developed Markets - Dynamic Config Loader
 * Loads market data from editable JSON config file
 */

import type { Market, MarketsByRegion, Country } from './types';
import { getGMTOffset } from './timezone';

// Default markets (used as fallback if config fails to load)
const defaultMarkets: Market[] = [
    {
        id: 'nyse',
        name: 'New York Stock Exchange',
        code: 'NYSE',
        country: 'United States',
        countryCode: 'US',

        timezone: 'America/New_York',
        openTime: '09:30',
        closeTime: '16:00',
        region: 'Americas',
        dstStart: '2026-03-08',
        dstEnd: '2026-11-01'
    }
];

// Markets array - will be populated from config
export let markets: Market[] = [...defaultMarkets];

/**
 * Load markets from config file
 */
export async function loadMarketsConfig(): Promise<Market[]> {
    try {
        const response = await fetch('markets-config.json');
        if (!response.ok) {
            throw new Error(`Failed to load config: ${response.status}`);
        }
        const config = await response.json();

        // Sort markets by GMT offset (Descending: Asia-Pacific first)
        markets = (config.markets as Market[]).sort((a, b) => {
            return getGMTOffset(b.timezone) - getGMTOffset(a.timezone);
        });

        return markets;
    } catch (error) {
        console.error('Error loading markets config, using defaults:', error);
        return defaultMarkets;
    }
}

/**
 * Get markets grouped by region
 */
export function getMarketsByRegion(): MarketsByRegion {
    const grouped: MarketsByRegion = {};
    for (const market of markets) {
        if (!grouped[market.region]) {
            grouped[market.region] = [];
        }
        grouped[market.region].push(market);
    }
    return grouped;
}

/**
 * Get unique countries from markets
 */
export function getUniqueCountries(): Country[] {
    const countries = new Map<string, Country>();
    for (const market of markets) {
        if (!countries.has(market.countryCode)) {
            countries.set(market.countryCode, {
                code: market.countryCode,
                name: market.country,

                region: market.region
            });
        }
    }
    return Array.from(countries.values());
}

/**
 * Get market by ID
 */
export function getMarketById(id: string): Market | undefined {
    return markets.find(m => m.id === id);
}
