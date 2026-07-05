import { describe, it, expect, beforeAll, vi } from 'vitest';
import { loadHolidaysConfig, getMarketHolidays } from './holidays';

const FIXTURE = {
    '2026': {
        nyse: [
            { date: '2026-01-01', name: "New Year's Day", status: 'closed' },
            { date: '2026-12-24', name: 'Christmas Eve', status: 'early-close', closeTime: '13:00' }
        ],
        nasdaq: 'nyse'
    }
};

beforeAll(async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
        ok: true,
        json: async () => FIXTURE
    })));
    await loadHolidaysConfig();
    vi.unstubAllGlobals();
});

describe('getMarketHolidays', () => {
    it('returns the holiday list for a market and year', () => {
        const holidays = getMarketHolidays('nyse', 2026);
        expect(holidays).toHaveLength(2);
        expect(holidays[0].name).toBe("New Year's Day");
    });

    it('resolves string aliases to the target market\'s list', () => {
        expect(getMarketHolidays('nasdaq', 2026)).toEqual(getMarketHolidays('nyse', 2026));
    });

    it('returns an empty list for an unknown market', () => {
        expect(getMarketHolidays('unknown', 2026)).toEqual([]);
    });

    it('returns an empty list for a year with no data', () => {
        expect(getMarketHolidays('nyse', 2030)).toEqual([]);
    });
});
