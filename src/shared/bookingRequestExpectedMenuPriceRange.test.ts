import { describe, expect, it } from 'vitest';

import type { BookingRequestExpectedMenuPriceRangeSample } from './bookingRequestExpectedMenuPriceRange';
import { bookingRequestExpectedMenuPriceRangeCalculate, percentileCont } from './bookingRequestExpectedMenuPriceRange';
import { bookingRequestMenuPriceClassUnionRangePerPersonCents } from './bookingRequestOfferPriceGuidance';

describe('percentileCont', () => {
    it('returns the only value for a singleton', () => {
        expect(percentileCont([42], 0.25)).toBe(42);
        expect(percentileCont([42], 0.75)).toBe(42);
    });

    it('interpolates between neighbors', () => {
        expect(percentileCont([0, 100], 0.25)).toBe(25);
        expect(percentileCont([0, 100], 0.75)).toBe(75);
    });
});

describe('bookingRequestExpectedMenuPriceRangeCalculate', () => {
    it('returns the static class-union prior when there are no samples', () => {
        const prior = bookingRequestMenuPriceClassUnionRangePerPersonCents(4);
        const result = bookingRequestExpectedMenuPriceRangeCalculate({
            participantsAdult: 4,
            participantsDiscounted: 0,
            samples: [],
        });

        expect(result).toEqual({
            minAmountCents: prior.minCents * 4,
            maxAmountCents: prior.maxCents * 4,
        });
    });

    it('uses the ten-plus prior when adults are 10 or more and history is empty', () => {
        const prior = bookingRequestMenuPriceClassUnionRangePerPersonCents(10);
        const result = bookingRequestExpectedMenuPriceRangeCalculate({
            participantsAdult: 10,
            participantsDiscounted: 0,
            samples: [],
        });

        expect(result.minAmountCents).toBe(prior.minCents * 10);
        expect(result.maxAmountCents).toBe(prior.maxCents * 10);
        expect(prior.minCents).toBeLessThan(bookingRequestMenuPriceClassUnionRangePerPersonCents(4).minCents);
    });

    it('uses local P25/P75 when the nearby headcount pool is rich', () => {
        const samples: BookingRequestExpectedMenuPriceRangeSample[] = Array.from({ length: 24 }, (_, index) => ({
            participantsAdult: 4,
            participantsDiscounted: 0,
            // Evenly spaced €80–€126 per person totals for 4 adults
            menuPriceCents: (8000 + index * 200) * 4,
        }));

        const result = bookingRequestExpectedMenuPriceRangeCalculate({
            participantsAdult: 4,
            participantsDiscounted: 0,
            samples,
        });

        // Per-person series: 8000, 8200, … 12600 → P25/P75 on 24 points
        const perPerson = samples.map((sample) => sample.menuPriceCents / 4).sort((a, b) => a - b);
        const expectedMinPp = percentileCont(perPerson, 0.25);
        const expectedMaxPp = percentileCont(perPerson, 0.75);

        expect(result.minAmountCents).toBe(Math.round(expectedMinPp * 4));
        expect(result.maxAmountCents).toBe(Math.round(expectedMaxPp * 4));
    });

    it('shrinks sparse local matches toward the global band', () => {
        const localSamples: BookingRequestExpectedMenuPriceRangeSample[] = [
            { participantsAdult: 4, participantsDiscounted: 0, menuPriceCents: 40_000 },
            { participantsAdult: 4, participantsDiscounted: 0, menuPriceCents: 44_000 },
        ];
        const globalOnlyFar: BookingRequestExpectedMenuPriceRangeSample[] = Array.from({ length: 30 }, (_, index) => ({
            participantsAdult: 12,
            participantsDiscounted: 0,
            menuPriceCents: (6000 + index * 100) * 12,
        }));

        const blended = bookingRequestExpectedMenuPriceRangeCalculate({
            participantsAdult: 4,
            participantsDiscounted: 0,
            samples: [...localSamples, ...globalOnlyFar],
        });
        const globalOnly = bookingRequestExpectedMenuPriceRangeCalculate({
            participantsAdult: 4,
            participantsDiscounted: 0,
            samples: globalOnlyFar,
        });

        // Two local matches → weight 2/22; band pulled toward global but not identical to pure global
        expect(blended.minAmountCents).not.toBe(globalOnly.minAmountCents);
        expect(blended.maxAmountCents).not.toBe(globalOnly.maxAmountCents);
        expect(blended.minAmountCents).toBeLessThan(blended.maxAmountCents);
    });

    it('falls back to pure global when the local pool is empty but history exists', () => {
        const samples: BookingRequestExpectedMenuPriceRangeSample[] = Array.from({ length: 20 }, (_, index) => ({
            participantsAdult: 12,
            participantsDiscounted: 0,
            menuPriceCents: (7000 + index * 100) * 12,
        }));

        const result = bookingRequestExpectedMenuPriceRangeCalculate({
            participantsAdult: 2,
            participantsDiscounted: 0,
            samples,
        });
        const perPerson = samples.map((sample) => sample.menuPriceCents / 12).sort((a, b) => a - b);

        expect(result.minAmountCents).toBe(Math.round(percentileCont(perPerson, 0.25) * 2));
        expect(result.maxAmountCents).toBe(Math.round(percentileCont(perPerson, 0.75) * 2));
    });

    it('ignores non-positive menu prices and zero paid headcounts', () => {
        const result = bookingRequestExpectedMenuPriceRangeCalculate({
            participantsAdult: 4,
            participantsDiscounted: 0,
            samples: [
                { participantsAdult: 0, participantsDiscounted: 0, menuPriceCents: 40_000 },
                { participantsAdult: 4, participantsDiscounted: 0, menuPriceCents: 0 },
                { participantsAdult: 4, participantsDiscounted: 0, menuPriceCents: -100 },
            ],
        });
        const prior = bookingRequestMenuPriceClassUnionRangePerPersonCents(4);
        expect(result).toEqual({
            minAmountCents: prior.minCents * 4,
            maxAmountCents: prior.maxCents * 4,
        });
    });

    it('scales discounted guests at half a paid participant', () => {
        const samples: BookingRequestExpectedMenuPriceRangeSample[] = Array.from({ length: 20 }, (_, index) => ({
            participantsAdult: 2,
            participantsDiscounted: 2,
            // paid = 3
            menuPriceCents: (9000 + index * 50) * 3,
        }));

        const result = bookingRequestExpectedMenuPriceRangeCalculate({
            participantsAdult: 2,
            participantsDiscounted: 2,
            samples,
        });
        const perPerson = samples.map((sample) => sample.menuPriceCents / 3).sort((a, b) => a - b);

        expect(result.minAmountCents).toBe(Math.round(percentileCont(perPerson, 0.25) * 3));
        expect(result.maxAmountCents).toBe(Math.round(percentileCont(perPerson, 0.75) * 3));
    });
});
