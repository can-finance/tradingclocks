
import { loadMarketsConfig } from './markets';
import { loadHolidaysConfig, getMarketHolidays } from './holidays';
import { buildHolidaysMarkup } from './holidaysMarkup';
import { pickActive } from './scrollSpy';
import { timeService } from './timeService';

/**
 * Shared entry for every holiday-calendar page. The year comes from the
 * container's data-year attribute, so adding a year is a new HTML file rather
 * than a new script.
 */
function getYear(container: HTMLElement): number {
    const declared = Number(container.dataset.year);
    return Number.isInteger(declared) ? declared : timeService.getNow().getFullYear();
}

async function render(container: HTMLElement): Promise<void> {
    await loadHolidaysConfig();
    const markets = await loadMarketsConfig();

    const { nav, content } = buildHolidaysMarkup({
        markets,
        year: getYear(container),
        getHolidays: getMarketHolidays,
    });

    container.innerHTML = content;
    const navContainer = document.getElementById('holidays-nav');
    if (navContainer) navContainer.innerHTML = nav;
}

async function init(): Promise<void> {
    const container = document.getElementById('holidays-container');
    if (!container) return;

    document.querySelectorAll('[data-holidays-year]').forEach(el => {
        el.textContent = String(getYear(container));
    });

    // The production build prerenders this markup (scripts/prerender.ts), so
    // only fetch and rebuild it when it isn't already there — as in dev.
    if (container.childElementCount === 0) {
        await render(container);
    }

    setupScrollBehavior();
}

function setupScrollBehavior(): void {
    document.querySelectorAll('.holidays-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = (link as HTMLAnchorElement).getAttribute('href');
            if (targetId) {
                document.querySelector(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Highlight the nav entry for whichever market is currently in view.
    //
    // rootMargin narrows the root to a band near the top of the viewport, and
    // the threshold stays at 0 so a card counts as soon as any part of it
    // crosses that band. A non-zero threshold cannot work here: the band is a
    // few hundred pixels tall while a market card runs to a thousand, so a tall
    // card could never show enough of itself to qualify.
    const inBand = new Set<Element>();

    const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (entry.isIntersecting) inBand.add(entry.target);
            else inBand.delete(entry.target);
        }

        // Leave the previous highlight alone when the band is briefly empty
        // (above the first card, or below the last), rather than flickering off.
        const marketId = pickActive(inBand)?.id.replace('market-', '');
        if (!marketId) return;

        document.querySelectorAll('.holidays-nav-link').forEach(link => {
            link.classList.toggle('active', (link as HTMLElement).dataset.market === marketId);
        });
    }, { threshold: 0, rootMargin: '-100px 0px -60% 0px' });

    document.querySelectorAll('.card.glass-panel[id^="market-"]').forEach(card => {
        observer.observe(card);
    });
}

document.addEventListener('DOMContentLoaded', init);
