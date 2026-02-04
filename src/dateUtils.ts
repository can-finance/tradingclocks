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

    // Format this UTC time as if it were in the target timezone
    const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit', minute: '2-digit',
        hour12: false
    });

    const parts = fmt.formatToParts(utcAssume);
    const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0');

    // Calculate offset: what time does the target TZ show vs UTC?
    const targetH = utcAssume.getUTCHours();
    const targetM = utcAssume.getUTCMinutes();
    const actualH = getPart('hour');
    const actualM = getPart('minute');

    // Offset in minutes (positive = ahead of UTC)
    let diffMins = (actualH * 60 + actualM) - (targetH * 60 + targetM);
    if (diffMins > 720) diffMins -= 1440;
    if (diffMins < -720) diffMins += 1440;

    // Adjust to get the correct UTC time for the given local time
    return new Date(utcAssume.getTime() - diffMins * 60000);
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
