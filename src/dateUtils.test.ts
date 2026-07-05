import { describe, it, expect } from 'vitest';
import {
    getDateFromIsoInTz,
    addDaysToDateStr,
    getDayOfWeekOfDateStr,
    getNextWeekday,
    formatDstDate
} from './dateUtils';

describe('getDateFromIsoInTz', () => {
    it('converts a wall time in a fixed-offset timezone', () => {
        expect(getDateFromIsoInTz('2026-07-06T09:00:00', 'Asia/Tokyo').toISOString())
            .toBe('2026-07-06T00:00:00.000Z');
    });

    it('handles non-whole-hour offsets (Kathmandu, UTC+5:45)', () => {
        expect(getDateFromIsoInTz('2026-07-07T09:00:00', 'Asia/Kathmandu').toISOString())
            .toBe('2026-07-07T03:15:00.000Z');
    });

    it('resolves standard time before a DST transition', () => {
        // Friday before US spring-forward: 09:30 EST = UTC-5
        expect(getDateFromIsoInTz('2026-03-06T09:30:00', 'America/New_York').toISOString())
            .toBe('2026-03-06T14:30:00.000Z');
    });

    it('resolves daylight time after a DST transition', () => {
        // Monday after US spring-forward: 09:30 EDT = UTC-4
        expect(getDateFromIsoInTz('2026-03-09T09:30:00', 'America/New_York').toISOString())
            .toBe('2026-03-09T13:30:00.000Z');
    });

    it('resolves wall times on the transition day itself (two-pass case)', () => {
        // 04:00 on US spring-forward day is already EDT; a single-pass offset
        // lookup samples EST and lands an hour late
        expect(getDateFromIsoInTz('2026-03-08T04:00:00', 'America/New_York').toISOString())
            .toBe('2026-03-08T08:00:00.000Z');
    });

    it('resolves fall-back day wall times', () => {
        // 09:30 on US fall-back day (2026-11-01) is EST again
        expect(getDateFromIsoInTz('2026-11-01T09:30:00', 'America/New_York').toISOString())
            .toBe('2026-11-01T14:30:00.000Z');
    });

    it('handles southern-hemisphere DST (Sydney)', () => {
        // AEST before the October transition
        expect(getDateFromIsoInTz('2026-10-02T10:00:00', 'Australia/Sydney').toISOString())
            .toBe('2026-10-02T00:00:00.000Z');
        // AEDT after the October transition
        expect(getDateFromIsoInTz('2026-10-05T10:00:00', 'Australia/Sydney').toISOString())
            .toBe('2026-10-04T23:00:00.000Z');
    });

    it('handles day-boundary crossings for UTC+13 (Auckland in DST)', () => {
        expect(getDateFromIsoInTz('2026-01-05T10:00:00', 'Pacific/Auckland').toISOString())
            .toBe('2026-01-04T21:00:00.000Z');
    });
});

describe('addDaysToDateStr', () => {
    it('adds within a month', () => {
        expect(addDaysToDateStr('2026-07-06', 1)).toBe('2026-07-07');
    });

    it('rolls over month and year boundaries', () => {
        expect(addDaysToDateStr('2026-12-31', 3)).toBe('2027-01-03');
    });

    it('handles leap days', () => {
        expect(addDaysToDateStr('2028-02-28', 1)).toBe('2028-02-29');
        expect(addDaysToDateStr('2026-02-28', 1)).toBe('2026-03-01');
    });
});

describe('getDayOfWeekOfDateStr', () => {
    it('returns the correct day of week', () => {
        expect(getDayOfWeekOfDateStr('2026-03-07')).toBe(6); // Saturday
        expect(getDayOfWeekOfDateStr('2026-03-08')).toBe(0); // Sunday
        expect(getDayOfWeekOfDateStr('2026-03-09')).toBe(1); // Monday
    });
});

describe('getNextWeekday', () => {
    it('returns the next day mid-week', () => {
        const tue = new Date(2026, 6, 7); // Tue Jul 7
        expect(getNextWeekday(tue).getDay()).toBe(3); // Wednesday
        expect(getNextWeekday(tue).getDate()).toBe(8);
    });

    it('skips the weekend from Friday', () => {
        const fri = new Date(2026, 6, 3); // Fri Jul 3
        const next = getNextWeekday(fri);
        expect(next.getDay()).toBe(1); // Monday
        expect(next.getDate()).toBe(6);
    });

    it('skips to Monday from Saturday', () => {
        const sat = new Date(2026, 6, 4); // Sat Jul 4
        const next = getNextWeekday(sat);
        expect(next.getDay()).toBe(1); // Monday
        expect(next.getDate()).toBe(6);
    });
});

describe('formatDstDate', () => {
    it('formats the calendar date regardless of local timezone', () => {
        // Regression: new Date("YYYY-MM-DD") parses as UTC midnight and shows
        // the previous day for users west of Greenwich
        expect(formatDstDate('2026-03-08')).toBe('Mar 8, 2026');
        expect(formatDstDate('2026-11-01')).toBe('Nov 1, 2026');
    });

    it('returns a dash for empty input', () => {
        expect(formatDstDate('')).toBe('-');
    });
});
