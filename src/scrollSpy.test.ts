import { describe, it, expect } from 'vitest';
import { pickActive, maxIntersectionRatio, bandHeight } from './scrollSpy';

const card = (id: string, top: number) => ({ id, getBoundingClientRect: () => ({ top }) });

describe('pickActive', () => {
    it('returns null when nothing is in the band', () => {
        expect(pickActive([])).toBeNull();
    });

    it('returns the only card when one is in the band', () => {
        expect(pickActive([card('tse', -200)])?.id).toBe('tse');
    });

    it('prefers the lower card when two share the band', () => {
        // krx is scrolling out the top, tse is scrolling in below it
        const active = pickActive([card('krx', -840), card('tse', 180)]);
        expect(active?.id).toBe('tse');
    });

    it('does not depend on iteration order', () => {
        const krx = card('krx', -840);
        const tse = card('tse', 180);
        expect(pickActive([krx, tse])?.id).toBe('tse');
        expect(pickActive([tse, krx])?.id).toBe('tse');
    });

    it('handles both cards being above the marker', () => {
        expect(pickActive([card('a', -900), card('b', -100)])?.id).toBe('b');
    });

    it('advances monotonically as the page scrolls down', () => {
        // One card enters as the previous leaves; the highlight should only
        // ever move forward through the list.
        const seen: string[] = [];
        for (let scroll = 0; scroll <= 2000; scroll += 100) {
            const inBand = [card('a', 0 - scroll), card('b', 800 - scroll), card('c', 1600 - scroll)]
                .filter(c => {
                    const { top } = c.getBoundingClientRect();
                    return top < 288 && top > -800;   // roughly "touching the band"
                });
            const active = pickActive(inBand);
            if (active && seen[seen.length - 1] !== active.id) seen.push(active.id);
        }
        expect(seen).toEqual(['a', 'b', 'c']);
    });
});

describe('observer band geometry', () => {
    it('computes the watched band from the rootMargin insets', () => {
        // rootMargin '-100px 0px -60% 0px' on a 720px viewport
        expect(bandHeight(720, 100, 60)).toBeCloseTo(188);
        // the previous '-100px 0px -50% 0px'
        expect(bandHeight(720, 100, 50)).toBeCloseTo(260);
    });

    it('caps the ratio a target taller than the band can reach', () => {
        // This is the defect the page hit: at a 720px viewport the old band was
        // 260px, so the tallest market cards could not reach a 0.3 threshold.
        const oldBand = bandHeight(720, 100, 50);
        expect(maxIntersectionRatio(1024, oldBand)).toBeLessThan(0.3);   // tse
        expect(maxIntersectionRatio(963, oldBand)).toBeLessThan(0.3);    // twse

        // Shorter cards cleared it, which is why the highlight worked for some
        // markets and not others.
        expect(maxIntersectionRatio(648, oldBand)).toBeGreaterThan(0.3); // nzx
        expect(maxIntersectionRatio(639, oldBand)).toBeGreaterThan(0.3); // asx
    });

    it('lets a card of any height qualify once the threshold is 0', () => {
        const band = bandHeight(720, 100, 60);
        for (const height of [200, 648, 1024, 5000]) {
            expect(maxIntersectionRatio(height, band)).toBeGreaterThan(0);
        }
    });

    it('shows the old threshold was viewport-dependent', () => {
        // On a tall monitor the same cards cleared 0.3, so the bug only showed
        // up on shorter viewports.
        expect(maxIntersectionRatio(1024, bandHeight(1080, 100, 50))).toBeGreaterThan(0.3);
        expect(maxIntersectionRatio(1024, bandHeight(720, 100, 50))).toBeLessThan(0.3);
    });
});
