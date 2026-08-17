/**
 * Scroll-spy helpers.
 *
 * Split out from the page wiring so the selection rule can be tested without a
 * live IntersectionObserver.
 */

interface Positioned {
    getBoundingClientRect(): { top: number };
}

/**
 * Pick the active element from those currently inside the observer band.
 *
 * Two cards share the band while one scrolls out and the next scrolls in, so
 * the choice is made by position rather than by observer entry order, which is
 * not specified to follow document order. The active one is the lowest to have
 * reached the band — equivalently the last whose top edge passed the marker —
 * which keeps the highlight moving in one direction as the reader scrolls down.
 */
export function pickActive<T extends Positioned>(inBand: Iterable<T>): T | null {
    let active: T | null = null;
    let activeTop = -Infinity;

    for (const candidate of inBand) {
        const { top } = candidate.getBoundingClientRect();
        if (top > activeTop) {
            active = candidate;
            activeTop = top;
        }
    }

    return active;
}

/**
 * Smallest intersection ratio an IntersectionObserver can ever report for a
 * target of `targetHeight` against a root band of `bandHeight`.
 *
 * A target taller than the band can only ever fill the band, so its ratio is
 * capped below 1 — and a threshold above that cap makes the observer silently
 * unable to fire for that target. Exported to document the constraint the
 * holiday pages hit; see maxIntersectionRatio's test.
 */
export function maxIntersectionRatio(targetHeight: number, bandHeight: number): number {
    if (targetHeight <= 0) return 0;
    return Math.min(bandHeight, targetHeight) / targetHeight;
}

/**
 * Height of the region an IntersectionObserver actually watches, given a
 * rootMargin of `-{topInset}px 0px -{bottomInsetPercent}% 0px`.
 */
export function bandHeight(viewportHeight: number, topInset: number, bottomInsetPercent: number): number {
    return viewportHeight - topInset - viewportHeight * (bottomInsetPercent / 100);
}
