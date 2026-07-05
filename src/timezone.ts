/**
 * DST-aware timezone utilities using native Intl API
 */

import type { Market, MarketStatus, FormattedTime, TimeOverride } from './types';
import { timeService } from './timeService';
import { getMarketHolidays, type Holiday } from './holidays';
import { getDateFromIsoInTz, addDaysToDateStr, getDayOfWeekOfDateStr } from './dateUtils';

/**
 * Parse a time string (HH:MM) and create a Date for today in the given timezone.
 * Returns a Date object representing that time in the target timezone.
 */
export function parseTimeInTimezone(timeStr: string, timezone: string): Date {
    const now = timeService.getNow();

    // Today's date in the target timezone (en-CA formats as YYYY-MM-DD)
    const dateStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(now);

    return getDateFromIsoInTz(`${dateStr}T${timeStr}:00`, timezone);
}

/**
 * Get time until market opens or closes
 */
export function getMarketStatus(market: Market, overrides: Partial<TimeOverride> = {}): MarketStatus {
    const openTime = overrides.openTime || market.openTime;
    let closeTime = overrides.closeTime || market.closeTime;

    const now = timeService.getNow();

    // Helper to get date string in market timezone (YYYY-MM-DD)
    const getMarketDateStr = (date: Date): string => {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: market.timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(date);
    };

    // Helper to get day of week in market timezone
    const getDayInMarket = (date: Date): number => {
        const dayFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: market.timezone,
            weekday: 'short'
        });
        const dayStr = dayFormatter.format(date);
        const dayMap: Record<string, number> = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
        return dayMap[dayStr] ?? 0;
    };

    // Helper to check if a specific date (YYYY-MM-DD) is a holiday
    const getHolidayForDateStr = (dateStr: string): Holiday | null => {
        const year = parseInt(dateStr.substring(0, 4));
        const holidays = getMarketHolidays(market.id, year);
        return holidays.find(h => h.date === dateStr) || null;
    };

    // Helper to find the next trading date (skips weekends and holidays).
    // Works on YYYY-MM-DD strings so day arithmetic can't drift across DST.
    const findNextTradingDateStr = (startDateStr: string): string => {
        let candidate = startDateStr;
        const maxAttempts = 14; // Don't loop forever

        for (let attempts = 0; attempts < maxAttempts; attempts++) {
            const candidateDay = getDayOfWeekOfDateStr(candidate);

            // Skip weekends
            if (candidateDay === 0) { // Sunday
                candidate = addDaysToDateStr(candidate, 1);
                continue;
            }
            if (candidateDay === 6) { // Saturday
                candidate = addDaysToDateStr(candidate, 2);
                continue;
            }

            // Skip full-closure holidays
            const holiday = getHolidayForDateStr(candidate);
            if (holiday && holiday.status === 'closed') {
                candidate = addDaysToDateStr(candidate, 1);
                continue;
            }

            // Found a valid trading day
            return candidate;
        }

        // Fallback if we couldn't find a valid day
        return candidate;
    };

    // Helper to get the market's open instant on a specific date, re-deriving
    // the timezone offset for that date so DST transitions between now and the
    // next open don't skew the result
    const openOnDate = (dateStr: string): Date =>
        getDateFromIsoInTz(`${dateStr}T${openTime}:00`, market.timezone);

    const todayStr = getMarketDateStr(now);
    const todayHoliday = getHolidayForDateStr(todayStr);

    let holidayName: string | undefined;

    // Handle today being a holiday
    if (todayHoliday) {
        holidayName = todayHoliday.name;
        if (todayHoliday.status === 'closed') {
            // Find next trading day starting from tomorrow
            const nextTradingDateStr = findNextTradingDateStr(addDaysToDateStr(todayStr, 1));
            const nextOpen = openOnDate(nextTradingDateStr);

            return {
                isOpen: false,
                isWeekend: false,
                timeUntil: nextOpen.getTime() - now.getTime(),
                nextEvent: 'opens',
                nextEventTime: nextOpen,
                holidayName,
                isTodayHoliday: true
            };
        } else if (todayHoliday.status === 'early-close' && todayHoliday.closeTime) {
            closeTime = todayHoliday.closeTime;
        }
    }

    const dayInMarket = getDayInMarket(now);

    // Weekend handling - find next trading day (which checks for holidays too)
    if (dayInMarket === 0 || dayInMarket === 6) {
        const firstWeekdayStr = addDaysToDateStr(todayStr, dayInMarket === 0 ? 1 : 2);
        const nextTradingDateStr = findNextTradingDateStr(firstWeekdayStr);
        const nextOpen = openOnDate(nextTradingDateStr);

        // Check if the first weekday was a holiday to show the info
        const mondayHoliday = getHolidayForDateStr(firstWeekdayStr);

        return {
            isOpen: false,
            isWeekend: true,
            timeUntil: nextOpen.getTime() - now.getTime(),
            nextEvent: 'opens',
            nextEventTime: nextOpen,
            holidayName: mondayHoliday?.status === 'closed' ? mondayHoliday.name : undefined
        };
    }

    const openDate = parseTimeInTimezone(openTime, market.timezone);
    const closeDate = parseTimeInTimezone(closeTime, market.timezone);

    // Before market opens
    if (now < openDate) {
        return {
            isOpen: false,
            isWeekend: false,
            timeUntil: openDate.getTime() - now.getTime(),
            nextEvent: 'opens',
            nextEventTime: openDate,
            holidayName
        };
    }

    // Market is open (or on lunch break)
    if (now >= openDate && now < closeDate) {
        // Parse lunch break times if they exist
        let lunchStartDate: Date | undefined;
        let lunchEndDate: Date | undefined;

        if (market.lunchStart && market.lunchEnd) {
            lunchStartDate = parseTimeInTimezone(market.lunchStart, market.timezone);
            lunchEndDate = parseTimeInTimezone(market.lunchEnd, market.timezone);

            // Check if currently on lunch break
            if (now >= lunchStartDate && now < lunchEndDate) {
                return {
                    isOpen: false,
                    isWeekend: false,
                    timeUntil: lunchEndDate.getTime() - now.getTime(),
                    nextEvent: 'reopens',
                    nextEventTime: lunchEndDate,
                    holidayName,
                    isOnLunch: true,
                    lunchStart: lunchStartDate,
                    lunchEnd: lunchEndDate
                };
            }

            // Check if lunch is coming up (before lunch)
            if (now < lunchStartDate) {
                return {
                    isOpen: true,
                    isWeekend: false,
                    timeUntil: lunchStartDate.getTime() - now.getTime(),
                    nextEvent: 'lunch-starts',
                    nextEventTime: lunchStartDate,
                    holidayName,
                    isOnLunch: false,
                    lunchStart: lunchStartDate,
                    lunchEnd: lunchEndDate
                };
            }
        }

        // Normal open (no lunch or after lunch)
        return {
            isOpen: true,
            isWeekend: false,
            timeUntil: closeDate.getTime() - now.getTime(),
            nextEvent: 'closes',
            nextEventTime: closeDate,
            holidayName,
            isOnLunch: false,
            lunchStart: lunchStartDate,
            lunchEnd: lunchEndDate
        };
    }

    // After market closes - calculate next open
    // Friday after close - check Monday; regular day - check tomorrow
    const nextDayStr = addDaysToDateStr(todayStr, dayInMarket === 5 ? 3 : 1);

    // Find valid trading day (skipping weekends and holidays)
    const nextTradingDateStr = findNextTradingDateStr(nextDayStr);
    const nextOpen = openOnDate(nextTradingDateStr);

    // Check if the immediate next day was a holiday to show info
    const nextDayHoliday = getHolidayForDateStr(nextDayStr);

    return {
        isOpen: false,
        isWeekend: false,
        timeUntil: nextOpen.getTime() - now.getTime(),
        nextEvent: 'opens',
        nextEventTime: nextOpen,
        holidayName: nextDayHoliday?.status === 'closed' ? nextDayHoliday.name : undefined
    };
}

/**
 * Format milliseconds as countdown string
 */
export function formatCountdown(ms: number): string {
    if (ms < 0) return '00:00:00';

    const seconds = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / (1000 * 60)) % 60;
    const hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    const pad = (n: number): string => String(n).padStart(2, '0');

    if (days > 0) {
        return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }

    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Format time in a specific timezone for display
 */
export function formatTimeInTimezone(date: Date, timezone: string): FormattedTime {
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    const tzFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'short'
    });

    const time = timeFormatter.format(date).replace(/\s/g, '').toLowerCase();
    const tzParts = tzFormatter.formatToParts(date);
    const tzAbbrev = tzParts.find(p => p.type === 'timeZoneName')?.value || timezone;

    return { time, tzAbbrev };
}

/**
 * Get user's local timezone
 */
export function getUserTimezone(): string {
    const override = timeService.getTimezone();
    if (override) return override;
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Get GMT offset for a timezone in hours
 */
export function getGMTOffset(timezone: string): number {
    try {
        const now = timeService.getNow();
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
