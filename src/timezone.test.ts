import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { getMarketStatus, parseTimeInTimezone, formatCountdown, getGMTOffset } from './timezone';
import { loadHolidaysConfig } from './holidays';
import { timeService } from './timeService';
import type { Market } from './types';

const HOLIDAYS_FIXTURE = {
    '2026': {
        nyse: [
            { date: '2026-09-07', name: 'Labor Day', status: 'closed' },
            { date: '2026-11-27', name: 'Day After Thanksgiving', status: 'early-close', closeTime: '13:00' }
        ]
    },
    '2027': {
        nyse: [
            { date: '2027-01-01', name: "New Year's Day", status: 'closed' }
        ]
    }
};

const nyse: Market = {
    id: 'nyse', name: 'New York Stock Exchange', code: 'NYSE',
    country: 'United States', countryCode: 'US',
    timezone: 'America/New_York', openTime: '09:30', closeTime: '16:00',
    region: 'Americas', dstStart: null, dstEnd: null
};

const asx: Market = {
    id: 'asx', name: 'Australian Securities Exchange', code: 'ASX',
    country: 'Australia', countryCode: 'AU',
    timezone: 'Australia/Sydney', openTime: '10:00', closeTime: '16:00',
    region: 'Asia-Pacific', dstStart: null, dstEnd: null
};

const tse: Market = {
    id: 'tse', name: 'Tokyo Stock Exchange', code: 'TSE',
    country: 'Japan', countryCode: 'JP',
    timezone: 'Asia/Tokyo', openTime: '09:00', closeTime: '15:30',
    region: 'Asia-Pacific', dstStart: null, dstEnd: null,
    lunchStart: '11:30', lunchEnd: '12:30'
};

function setNow(iso: string): void {
    timeService.setTime(new Date(iso));
}

beforeAll(async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
        ok: true,
        json: async () => HOLIDAYS_FIXTURE
    })));
    await loadHolidaysConfig();
    vi.unstubAllGlobals();
});

afterEach(() => {
    timeService.reset();
});

describe('getMarketStatus — regular days', () => {
    it('reports open mid-session with countdown to close', () => {
        setNow('2026-07-07T15:00:00Z'); // Tue 11:00 EDT
        const s = getMarketStatus(nyse);
        expect(s.isOpen).toBe(true);
        expect(s.nextEvent).toBe('closes');
        expect(s.nextEventTime.toISOString()).toBe('2026-07-07T20:00:00.000Z');
        expect(s.timeUntil).toBe(5 * 60 * 60 * 1000);
    });

    it('reports closed pre-open with countdown to today\'s open', () => {
        setNow('2026-07-07T12:00:00Z'); // Tue 08:00 EDT
        const s = getMarketStatus(nyse);
        expect(s.isOpen).toBe(false);
        expect(s.isWeekend).toBe(false);
        expect(s.nextEvent).toBe('opens');
        expect(s.nextEventTime.toISOString()).toBe('2026-07-07T13:30:00.000Z');
    });

    it('targets tomorrow\'s open after close on a weekday', () => {
        setNow('2026-07-07T21:00:00Z'); // Tue 17:00 EDT
        const s = getMarketStatus(nyse);
        expect(s.isOpen).toBe(false);
        expect(s.nextEventTime.toISOString()).toBe('2026-07-08T13:30:00.000Z');
    });

    it('applies time overrides', () => {
        setNow('2026-07-07T11:00:00Z'); // Tue 07:00 EDT
        const s = getMarketStatus(nyse, { openTime: '08:00' });
        expect(s.nextEvent).toBe('opens');
        expect(s.nextEventTime.toISOString()).toBe('2026-07-07T12:00:00.000Z');
    });
});

describe('getMarketStatus — DST transitions', () => {
    it('weekend spanning US spring-forward targets Monday 09:30 EDT', () => {
        setNow('2026-03-07T12:00:00Z'); // Saturday
        const s = getMarketStatus(nyse);
        expect(s.isWeekend).toBe(true);
        // 09:30 EDT = 13:30 UTC; day-arithmetic on the Saturday open instant
        // would produce 14:30 UTC (an hour late)
        expect(s.nextEventTime.toISOString()).toBe('2026-03-09T13:30:00.000Z');
    });

    it('Friday after close spanning US spring-forward targets Monday 09:30 EDT', () => {
        setNow('2026-03-06T22:00:00Z'); // Fri 17:00 EST
        const s = getMarketStatus(nyse);
        expect(s.nextEventTime.toISOString()).toBe('2026-03-09T13:30:00.000Z');
    });

    it('Friday after close spanning Sydney spring-forward targets Monday 10:00 AEDT', () => {
        setNow('2026-10-02T07:00:00Z'); // Fri 17:00 AEST
        const s = getMarketStatus(asx);
        // Monday 2026-10-05 10:00 AEDT = Sunday 23:00 UTC
        expect(s.nextEventTime.toISOString()).toBe('2026-10-04T23:00:00.000Z');
    });
});

describe('getMarketStatus — lunch breaks', () => {
    it('reports lunch break with countdown to reopen', () => {
        setNow('2026-07-07T03:00:00Z'); // Tue 12:00 JST
        const s = getMarketStatus(tse);
        expect(s.isOpen).toBe(false);
        expect(s.isOnLunch).toBe(true);
        expect(s.nextEvent).toBe('reopens');
        expect(s.nextEventTime.toISOString()).toBe('2026-07-07T03:30:00.000Z');
    });

    it('counts down to lunch during the morning session', () => {
        setNow('2026-07-07T01:00:00Z'); // Tue 10:00 JST
        const s = getMarketStatus(tse);
        expect(s.isOpen).toBe(true);
        expect(s.nextEvent).toBe('lunch-starts');
        expect(s.nextEventTime.toISOString()).toBe('2026-07-07T02:30:00.000Z');
    });

    it('counts down to close during the afternoon session', () => {
        setNow('2026-07-07T04:00:00Z'); // Tue 13:00 JST
        const s = getMarketStatus(tse);
        expect(s.isOpen).toBe(true);
        expect(s.nextEvent).toBe('closes');
        expect(s.nextEventTime.toISOString()).toBe('2026-07-07T06:30:00.000Z');
    });
});

describe('getMarketStatus — holidays', () => {
    it('reports a full-closure holiday and targets the next trading day', () => {
        setNow('2026-09-07T14:00:00Z'); // Labor Day Monday, 10:00 EDT
        const s = getMarketStatus(nyse);
        expect(s.isOpen).toBe(false);
        expect(s.isTodayHoliday).toBe(true);
        expect(s.holidayName).toBe('Labor Day');
        expect(s.nextEventTime.toISOString()).toBe('2026-09-08T13:30:00.000Z');
    });

    it('skips a Monday holiday from Friday after close', () => {
        setNow('2026-09-04T21:00:00Z'); // Fri 17:00 EDT before Labor Day
        const s = getMarketStatus(nyse);
        expect(s.holidayName).toBe('Labor Day');
        expect(s.nextEventTime.toISOString()).toBe('2026-09-08T13:30:00.000Z');
    });

    it('skips a Monday holiday from the weekend', () => {
        setNow('2026-09-05T12:00:00Z'); // Saturday before Labor Day
        const s = getMarketStatus(nyse);
        expect(s.isWeekend).toBe(true);
        expect(s.holidayName).toBe('Labor Day');
        expect(s.nextEventTime.toISOString()).toBe('2026-09-08T13:30:00.000Z');
    });

    it('applies early-close times while open', () => {
        setNow('2026-11-27T15:00:00Z'); // Fri 10:00 EST, early close 13:00
        const s = getMarketStatus(nyse);
        expect(s.isOpen).toBe(true);
        expect(s.holidayName).toBe('Day After Thanksgiving');
        expect(s.nextEventTime.toISOString()).toBe('2026-11-27T18:00:00.000Z'); // 13:00 EST
    });

    it('treats the market as closed after an early close', () => {
        setNow('2026-11-27T19:00:00Z'); // Fri 14:00 EST, after 13:00 early close
        const s = getMarketStatus(nyse);
        expect(s.isOpen).toBe(false);
        expect(s.nextEventTime.toISOString()).toBe('2026-11-30T14:30:00.000Z'); // Mon 09:30 EST
    });

    it('skips New Year\'s Day across the year boundary', () => {
        setNow('2026-12-31T22:00:00Z'); // Thu 17:00 EST
        const s = getMarketStatus(nyse);
        expect(s.holidayName).toBe("New Year's Day");
        // Fri Jan 1 is a holiday, Jan 2-3 is the weekend -> Mon Jan 4
        expect(s.nextEventTime.toISOString()).toBe('2027-01-04T14:30:00.000Z');
    });
});

describe('parseTimeInTimezone', () => {
    it('parses a time for today in the market timezone', () => {
        setNow('2026-07-07T15:00:00Z');
        expect(parseTimeInTimezone('09:30', 'America/New_York').toISOString())
            .toBe('2026-07-07T13:30:00.000Z');
    });

    it('uses the market\'s calendar date, not UTC\'s', () => {
        setNow('2026-07-07T23:00:00Z'); // already Jul 8, 08:00 in Tokyo
        expect(parseTimeInTimezone('09:00', 'Asia/Tokyo').toISOString())
            .toBe('2026-07-08T00:00:00.000Z');
    });
});

describe('formatCountdown', () => {
    it('clamps negative values', () => {
        expect(formatCountdown(-5000)).toBe('00:00:00');
    });

    it('formats sub-day durations', () => {
        expect(formatCountdown(((1 * 60 + 1) * 60 + 1) * 1000)).toBe('01:01:01');
    });

    it('formats multi-day durations', () => {
        expect(formatCountdown((((25 * 60 + 1) * 60) + 1) * 1000)).toBe('1d 01:01:01');
    });
});

describe('getGMTOffset', () => {
    it('reflects DST in the offset', () => {
        setNow('2026-07-07T12:00:00Z');
        expect(getGMTOffset('America/New_York')).toBe(-4); // EDT
        setNow('2026-01-15T12:00:00Z');
        expect(getGMTOffset('America/New_York')).toBe(-5); // EST
        expect(getGMTOffset('Australia/Sydney')).toBe(11); // AEDT
    });

    it('handles half-hour offsets', () => {
        setNow('2026-07-07T12:00:00Z');
        expect(getGMTOffset('Asia/Kolkata')).toBe(5.5);
    });
});
