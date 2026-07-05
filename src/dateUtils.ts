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
 * Get the UTC offset (in ms) of a timezone at a given instant.
 */
function getTimezoneOffsetMs(instant: Date, timezone: string): number {
    // Format with full date so day-boundary crossings (e.g. UTC+12/+13) are handled correctly
    const fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
        hour12: false
    });

    const parts = fmt.formatToParts(instant);
    const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0');

    // Build UTC ms for what the timezone's wall clock shows (treating it as if it were UTC)
    const tzAsIfUtcMs = Date.UTC(
        getPart('year'),
        getPart('month') - 1,
        getPart('day'),
        getPart('hour') % 24, // guard against Intl returning '24' at midnight
        getPart('minute')
    );

    // The formatted wall clock has no seconds, so compare against the instant
    // truncated to the minute (offsets are always whole minutes)
    const instantMs = Math.floor(instant.getTime() / 60000) * 60000;
    return tzAsIfUtcMs - instantMs;
}

/**
 * Converts an ISO datetime string (e.g., "2026-02-05T09:30:00") interpreted
 * as wall-clock time in the specified timezone into a UTC Date object.
 *
 * Uses a two-pass offset lookup: the offset is first estimated at the wall
 * time treated as UTC, then re-measured at the resulting candidate instant,
 * so a DST transition falling between those two moments can't produce a
 * stale offset.
 */
export function getDateFromIsoInTz(isoStr: string, timezone: string): Date {
    const wallAsUtc = new Date(isoStr + 'Z');
    let result = wallAsUtc;
    for (let i = 0; i < 2; i++) {
        const offsetMs = getTimezoneOffsetMs(result, timezone);
        result = new Date(wallAsUtc.getTime() - offsetMs);
    }
    return result;
}

/**
 * Add days to a YYYY-MM-DD date string. Pure calendar arithmetic done in UTC,
 * so it is immune to DST transitions in both the browser and market timezones.
 */
export function addDaysToDateStr(dateStr: string, days: number): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * Day of week (0=Sunday .. 6=Saturday) for a YYYY-MM-DD date string.
 */
export function getDayOfWeekOfDateStr(dateStr: string): number {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * Format a date string (YYYY-MM-DD) for display
 */
export function formatDstDate(dateStr: string): string {
    if (!dateStr) return '-';
    // Parse components into a local date: new Date("YYYY-MM-DD") would parse
    // as UTC midnight and display the previous day west of Greenwich
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    });
}
