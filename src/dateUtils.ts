/**
 * Shared date utility functions
 */

/**
 * Returns the next weekday (Mon-Fri) after the given date.
 */
export function getNextWeekday(date: Date): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + 1); // Start with tomorrow
    while (d.getDay() === 0 || d.getDay() === 6) {
        d.setDate(d.getDate() + 1);
    }
    return d;
}

/**
 * Converts an ISO datetime string (e.g., "2026-02-05T09:30:00") interpreted
 * as local time in the specified timezone into a UTC Date object.
 */
export function getDateFromIsoInTz(isoStr: string, timezone: string): Date {
    // Treat isoStr as UTC first to get a reference point
    const utcAssume = new Date(isoStr + 'Z');

    // Format with full date so day-boundary crossings (e.g. UTC+12/+13) are handled correctly
    const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
        hour12: false
    });

    const parts = fmt.formatToParts(utcAssume);
    const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0');

    const tzYear = getPart('year');
    const tzMonth = getPart('month') - 1; // 0-indexed
    const tzDay = getPart('day');
    const tzHour = getPart('hour') % 24; // guard against Intl returning '24' at midnight
    const tzMinute = getPart('minute');

    // Build UTC ms for what the timezone shows (treating it as if it were UTC)
    const tzAsIfUtcMs = Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMinute);

    // Offset = TZ_local_as_UTC − real_UTC; subtract it to get the correct UTC instant
    const offsetMs = tzAsIfUtcMs - utcAssume.getTime();
    return new Date(utcAssume.getTime() - offsetMs);
}

/**
 * Format a date string (YYYY-MM-DD) for display
 */
export function formatDstDate(dateStr: string): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    });
}
