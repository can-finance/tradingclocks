
import { loadMarketsConfig } from './markets';
import { loadHolidaysConfig, getMarketHolidays } from './holidays';
import { buildScheduleMarkup } from './scheduleMarkup';
import { getUserTimezone } from './timezone';
import { timeService } from './timeService';
import { getNextWeekday, toDateStr } from './dateUtils';

async function init(): Promise<void> {
    const container = document.getElementById('schedule-container');
    if (!container) return;

    const [markets] = await Promise.all([loadMarketsConfig(), loadHolidaysConfig()]);

    // Unlike the other pages this always re-renders over the prerendered
    // markup: the build can only serve market-local hours, and the point of
    // this page is converting them to the visitor's own timezone.
    const targetDateStr = toDateStr(getNextWeekday(timeService.getNow()));

    container.innerHTML = buildScheduleMarkup({
        markets,
        targetDateStr,
        displayTimezone: getUserTimezone(),
        getHoliday: (marketId, dateStr) =>
            getMarketHolidays(marketId, Number(dateStr.slice(0, 4)))
                .find(h => h.date === dateStr) ?? null,
    });
}

document.addEventListener('DOMContentLoaded', init);
