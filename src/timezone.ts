/**
 * DST-aware timezone utilities using native Intl API
 */

import type { Market, MarketStatus, FormattedTime, TimeOverride } from './types';
import { timeService } from './timeService';
import { getMarketHolidays } from './holidays';

/**
 * Parse a time string (HH:MM) and create a Date for today in the given timezone.
 * Returns a Date object representing that time in the target timezone.
 */
export function parseTimeInTimezone(timeStr: string, timezone: string): Date {
    const now = timeService.getNow();

    // Get today's date components in the target timezone
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const parts = dateFormatter.formatToParts(now);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;

    // Parse the time string
    const [hours, minutes] = timeStr.split(':').map(Number);

    // Create an ISO string that we'll interpret in the target timezone
    // We need to find the UTC time that corresponds to this local time in the timezone

    // First, create a date in UTC with these components
    const targetLocalISO = `${year}-${month}-${day}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

    // Now we need to find what UTC time equals this local time in the target timezone
    // We do this by creating a date and adjusting for the timezone offset

    // Get the offset of the target timezone at this approximate time
    const tempDate = new Date(targetLocalISO + 'Z'); // Interpret as UTC first

    // Format this UTC time as if it were in the target timezone to find the offset
    const targetFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    // Parse what time it would be in the target timezone when it's tempDate in UTC
    const tzParts = targetFormatter.formatToParts(tempDate);
    const tzHour = parseInt(tzParts.find(p => p.type === 'hour')?.value || '0');
    const tzMinute = parseInt(tzParts.find(p => p.type === 'minute')?.value || '0');

    // Calculate offset in minutes: target_local = UTC + offset
    // So if UTC is 12:00 and target shows 7:00, offset is -5 hours (-300 minutes)
    const tempHours = tempDate.getUTCHours();
    const tempMinutes = tempDate.getUTCMinutes();

    let offsetMinutes = (tzHour * 60 + tzMinute) - (tempHours * 60 + tempMinutes);

    // Handle day boundary crossings
    if (offsetMinutes > 720) offsetMinutes -= 1440;
    if (offsetMinutes < -720) offsetMinutes += 1440;

    // Now create the correct UTC time
    // We want: targetLocalTime = UTC + offset
    // So: UTC = targetLocalTime - offset
    const targetMs = new Date(targetLocalISO + 'Z').getTime();
    const correctUTC = targetMs - (offsetMinutes * 60 * 1000);

    return new Date(correctUTC);
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

    // Helper to find next trading day (skips weekends and holidays)
    const findNextTradingDay = (startDate: Date): { nextOpen: Date; holidayName?: string } => {
        let candidate = new Date(startDate);
        let attempts = 0;
        const maxAttempts = 14; // Don't loop forever

        while (attempts < maxAttempts) {
            const candidateDay = getDayInMarket(candidate);

            // Skip weekends
            if (candidateDay === 0) { // Sunday
                candidate.setDate(candidate.getDate() + 1);
                attempts++;
                continue;
            }
            if (candidateDay === 6) { // Saturday
                candidate.setDate(candidate.getDate() + 2);
                attempts++;
                continue;
            }

            // Check if this day is a holiday
            const candidateDateStr = getMarketDateStr(candidate);
            const year = parseInt(candidateDateStr.substring(0, 4));
            const holidays = getMarketHolidays(market.id, year);
            const holiday = holidays.find(h => h.date === candidateDateStr);

            if (holiday && holiday.status === 'closed') {
                // This is a holiday, skip to next day and get the holiday name for display
                candidate.setDate(candidate.getDate() + 1);
                attempts++;
                continue;
            }

            // Found a valid trading day
            // Check if there's an upcoming holiday (for the "next day is a holiday" case)
            // Actually, we want to return the holiday info if the *previously checked* day was a holiday
            // For now, just return the valid trading day
            return { nextOpen: candidate };
        }

        // Fallback if we couldn't find a valid day
        return { nextOpen: candidate };
    };

    // Helper to check if a specific date is a holiday
    const getHolidayForDate = (date: Date): { name: string; status: string; closeTime?: string } | null => {
        const dateStr = getMarketDateStr(date);
        const year = parseInt(dateStr.substring(0, 4));
        const holidays = getMarketHolidays(market.id, year);
        return holidays.find(h => h.date === dateStr) || null;
    };

    const todayHoliday = getHolidayForDate(now);

    let holidayName: string | undefined;

    // Handle today being a holiday
    if (todayHoliday) {
        holidayName = todayHoliday.name;
        if (todayHoliday.status === 'closed') {
            // Find next trading day starting from tomorrow
            const tomorrow = new Date(parseTimeInTimezone(openTime, market.timezone));
            tomorrow.setDate(tomorrow.getDate() + 1);
            const { nextOpen } = findNextTradingDay(tomorrow);

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

    const openDate = parseTimeInTimezone(openTime, market.timezone);
    const closeDate = parseTimeInTimezone(closeTime, market.timezone);
    const dayInMarket = getDayInMarket(now);

    // Weekend handling - find next trading day (which checks for holidays too)
    if (dayInMarket === 0 || dayInMarket === 6) {
        const daysUntilMonday = dayInMarket === 0 ? 1 : 2;
        const potentialMonday = new Date(openDate);
        potentialMonday.setDate(potentialMonday.getDate() + daysUntilMonday);

        // Check if Monday (or the next weekday) is a holiday
        const { nextOpen } = findNextTradingDay(potentialMonday);

        // Check if the first weekday was a holiday to show the info
        const mondayHoliday = getHolidayForDate(potentialMonday);

        return {
            isOpen: false,
            isWeekend: true,
            timeUntil: nextOpen.getTime() - now.getTime(),
            nextEvent: 'opens',
            nextEventTime: nextOpen,
            holidayName: mondayHoliday?.status === 'closed' ? mondayHoliday.name : undefined
        };
    }

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
    let potentialNextOpen = new Date(openDate);
    if (dayInMarket === 5) {
        // Friday after close - check Monday
        potentialNextOpen.setDate(potentialNextOpen.getDate() + 3);
    } else {
        // Regular day - check tomorrow
        potentialNextOpen.setDate(potentialNextOpen.getDate() + 1);
    }

    // Find valid trading day (skipping holidays)
    const { nextOpen } = findNextTradingDay(potentialNextOpen);

    // Check if the immediate next day was a holiday to show info
    const nextDayHoliday = getHolidayForDate(potentialNextOpen);

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
