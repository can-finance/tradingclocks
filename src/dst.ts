
import { loadMarketsConfig } from './markets';
import { buildDstMarkup } from './dstMarkup';

async function init(): Promise<void> {
    const container = document.getElementById('dst-table-container');
    if (!container) return;

    // The production build prerenders this markup (scripts/prerender.ts), so
    // only fetch and rebuild it when it isn't already there — as in dev.
    if (container.childElementCount > 0) return;

    const markets = await loadMarketsConfig();
    container.innerHTML = buildDstMarkup(markets);
}

document.addEventListener('DOMContentLoaded', init);
