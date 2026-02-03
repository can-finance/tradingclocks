/**
 * DST-aware timezone utilities using native Intl API
 */

import type { Market, MarketStatus, FormattedTime, TimeOverride } from './types';

/**
 * Parse a time string (HH:MM) and create a Date for today in the given timezone.
 * Returns a Date object representing that time in the target timezone.
 */
export function parseTimeInTimezone(timeStr: string, timezone: string): Date {
    const now = new Date();

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
    const closeTime = overrides.closeTime || market.closeTime;

    const now = new Date();
    const openDate = parseTimeInTimezone(openTime, market.timezone);
    const closeDate = parseTimeInTimezone(closeTime, market.timezone);

    // Get the day in market timezone
    const marketNow = new Date(now.toLocaleString('en-US', { timeZone: market.timezone }));
    const dayInMarket = marketNow.getDay();

    // Weekend handling
    if (dayInMarket === 0 || dayInMarket === 6) {
        // Calculate time until Monday open
        const daysUntilMonday = dayInMarket === 0 ? 1 : 2;
        const mondayOpen = new Date(openDate);
        mondayOpen.setDate(mondayOpen.getDate() + daysUntilMonday);

        return {
            isOpen: false,
            isWeekend: true,
            timeUntil: mondayOpen.getTime() - now.getTime(),
            nextEvent: 'opens',
            nextEventTime: mondayOpen
        };
    }

    // Before market opens
    if (now < openDate) {
        return {
            isOpen: false,
            isWeekend: false,
            timeUntil: openDate.getTime() - now.getTime(),
            nextEvent: 'opens',
            nextEventTime: openDate
        };
    }

    // Market is open
    if (now >= openDate && now < closeDate) {
        return {
            isOpen: true,
            isWeekend: false,
            timeUntil: closeDate.getTime() - now.getTime(),
            nextEvent: 'closes',
            nextEventTime: closeDate
        };
    }

    // After market closes - calculate next open
    const nextOpenDate = new Date(openDate);
    if (dayInMarket === 5) {
        // Friday after close - next open is Monday
        nextOpenDate.setDate(nextOpenDate.getDate() + 3);
    } else {
        // Regular day - next open is tomorrow
        nextOpenDate.setDate(nextOpenDate.getDate() + 1);
    }

    return {
        isOpen: false,
        isWeekend: false,
        timeUntil: nextOpenDate.getTime() - now.getTime(),
        nextEvent: 'opens',
        nextEventTime: nextOpenDate
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
        const now = new Date();
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
