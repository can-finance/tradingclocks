
export interface Holiday {
    date: string; // YYYY-MM-DD
    name: string;
    status: 'closed' | 'early-close';
    openTime?: string; // Optional override
    closeTime?: string; // Optional override
}

// Map of year -> marketId -> Holiday[]
// marketId can be a string key, or a reference string like "nyse"
export type HolidaysConfig = Record<string, Record<string, Holiday[] | string>>;

// Runtime cache
let holidaysCache: HolidaysConfig = {};

/**
 * Load holidays from config file
 */
export async function loadHolidaysConfig(): Promise<void> {
    try {
        const response = await fetch(`${import.meta.env.BASE_URL}holidays.json`);
        if (!response.ok) {
            throw new Error(`Failed to load holidays: ${response.status}`);
        }
        holidaysCache = await response.json();
        console.log('Holidays loaded:', Object.keys(holidaysCache));
    } catch (error) {
        console.error('Error loading holidays config:', error);
        // Fallback or empty
        holidaysCache = {};
    }
}

/**
 * Get holidays for a specific market and year
 */
export function getMarketHolidays(marketId: string, year: number): Holiday[] {
    const yearData = holidaysCache[String(year)];
    if (!yearData) return [];

    let marketData = yearData[marketId];

    // Handle aliases (e.g. "nasdaq": "nyse")
    if (typeof marketData === 'string') {
        marketData = yearData[marketData];
    }

    return (marketData as Holiday[]) || [];
}

/**
 * Check if a specific date is a holiday for a market
 */
export function getHolidayForDate(marketId: string, date: Date): Holiday | null {
    const year = date.getFullYear();
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

    const holidays = getMarketHolidays(marketId, year);
    return holidays.find(h => h.date === dateStr) || null;
}
