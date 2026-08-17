import { describe, it, expect } from 'vitest';
import { buildHolidaysMarkup } from './holidaysMarkup';
import { buildDstMarkup } from './dstMarkup';
import { buildScheduleMarkup } from './scheduleMarkup';
import type { Market } from './types';
import type { Holiday } from './holidays';

const nyse: Market = {
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
    dstEnd: '2026-11-01',
};

const tse: Market = {
    id: 'tse',
    name: 'Tokyo Stock Exchange',
    code: 'TSE',
    country: 'Japan',
    countryCode: 'JP',
    timezone: 'Asia/Tokyo',
    openTime: '09:00',
    closeTime: '15:00',
    region: 'Asia-Pacific',
    dstStart: null,
    dstEnd: null,
    lunchStart: '11:30',
    lunchEnd: '12:30',
};

const holidays: Record<string, Holiday[]> = {
    nyse: [
        { date: '2026-01-01', name: "New Year's Day", status: 'closed' },
        { date: '2026-11-27', name: 'Day After Thanksgiving', status: 'early-close', closeTime: '13:00' },
    ],
    tse: [{ date: '2026-01-01', name: "New Year's Day", status: 'closed' }],
};

const getHolidays = (marketId: string, year: number): Holiday[] =>
    year === 2026 ? holidays[marketId] ?? [] : [];

describe('buildHolidaysMarkup', () => {
    it('renders holiday names and dates into the content', () => {
        const { content } = buildHolidaysMarkup({ markets: [nyse, tse], year: 2026, getHolidays });

        expect(content).toContain('New York Stock Exchange');
        expect(content).toContain('Tokyo Stock Exchange');
        // Jan 1 2026 is a Thursday — a UTC-parsed date would render Wednesday
        expect(content).toContain('Thu, Jan 1');
        expect(content).toContain('Early Close');
        expect(content).toContain('13:00');
    });

    it('lists the same markets in the nav as in the content', () => {
        const { nav, content } = buildHolidaysMarkup({ markets: [nyse, tse], year: 2026, getHolidays });

        expect(nav).toContain('data-market="nyse"');
        expect(nav).toContain('data-market="tse"');
        expect(content).toContain('id="market-nyse"');
        expect(content).toContain('id="market-tse"');
    });

    it('omits markets with no holidays on record', () => {
        const getOnlyNyse = (id: string, year: number) => (id === 'nyse' ? getHolidays(id, year) : []);
        const { nav, content } = buildHolidaysMarkup({ markets: [nyse, tse], year: 2026, getHolidays: getOnlyNyse });

        expect(content).not.toContain('Tokyo Stock Exchange');
        expect(nav).not.toContain('data-market="tse"');
    });

    it('renders publication-status badges for 2027 but not 2026', () => {
        const always = () => holidays.nyse;

        expect(buildHolidaysMarkup({ markets: [nyse], year: 2026, getHolidays: always }).content)
            .not.toContain('badge-confirmed');
        expect(buildHolidaysMarkup({ markets: [nyse], year: 2027, getHolidays: always }).content)
            .toContain('Fully Updated');
    });

    it('escapes market and holiday text', () => {
        const evil: Market = { ...nyse, name: '<script>x</script>' };
        const { content } = buildHolidaysMarkup({ markets: [evil], year: 2026, getHolidays });

        expect(content).not.toContain('<script>x</script>');
        expect(content).toContain('&lt;script&gt;');
    });
});

describe('buildDstMarkup', () => {
    it('renders one row per country with its DST status', () => {
        const html = buildDstMarkup([nyse, tse]);

        expect(html).toContain('United States');
        expect(html).toContain('Observes DST');
        expect(html).toContain('Japan');
        expect(html).toContain('No DST');
    });
});

describe('buildScheduleMarkup', () => {
    const base = {
        markets: [nyse, tse],
        targetDateStr: '2026-06-15',
        getHoliday: () => null,
    };

    it('shows market-local times when no display timezone is given', () => {
        const html = buildScheduleMarkup({ ...base, displayTimezone: null });

        expect(html).toContain("own local time");
        expect(html).toContain('9:30am');   // NYSE in America/New_York
        expect(html).toContain('9:00am');   // TSE in Asia/Tokyo
    });

    it('converts to the display timezone when one is given', () => {
        const html = buildScheduleMarkup({ ...base, displayTimezone: 'UTC' });

        expect(html).toContain('converted to your local time');
        expect(html).toContain('UTC');
        expect(html).toContain('1:30pm');   // NYSE 09:30 EDT = 13:30 UTC
    });

    it('subtracts the lunch break from the session duration', () => {
        const html = buildScheduleMarkup({ ...base, displayTimezone: null });

        // TSE: 09:00-15:00 minus a one-hour lunch
        expect(html).toContain('5h');
    });

    it('marks a market closed for a full-day holiday', () => {
        const html = buildScheduleMarkup({
            ...base,
            displayTimezone: null,
            getHoliday: (marketId: string) =>
                marketId === 'nyse'
                    ? { date: '2026-06-15', name: 'Test Holiday', status: 'closed' as const }
                    : null,
        });

        expect(html).toContain('Closed — Test Holiday');
    });
});
