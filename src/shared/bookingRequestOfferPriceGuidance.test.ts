import { describe, expect, it } from 'vitest';

import { bookingRequestOfferPriceGuidance, bookingRequestPaidParticipants } from './bookingRequestOfferPriceGuidance';

describe('bookingRequestPaidParticipants', () => {
    it('counts discounted guests at half', () => {
        expect(bookingRequestPaidParticipants(4, 2)).toBe(5);
    });
});

describe('bookingRequestOfferPriceGuidance', () => {
    it('returns mid-range suggestion for MEDIUM with no travel', () => {
        const result = bookingRequestOfferPriceGuidance({
            priceClassType: 'MEDIUM',
            participantsAdult: 4,
            participantsDiscounted: 0,
            estimatedTravelExpensesCents: 0,
        });

        expect(result.suggestedOfferAmountCents).toBe(9400);
        expect(result.minOfferAmountCents).toBeGreaterThan(0);
        expect(result.maxOfferAmountCents).toBeGreaterThan(result.suggestedOfferAmountCents);
        expect(result.minOfferAmountHardCents).toBeNull();
    });

    it('uses discounted ranges when adults are 10 or more', () => {
        const underTen = bookingRequestOfferPriceGuidance({
            priceClassType: 'LOW',
            participantsAdult: 9,
            participantsDiscounted: 0,
            estimatedTravelExpensesCents: 0,
        });
        const tenPlus = bookingRequestOfferPriceGuidance({
            priceClassType: 'LOW',
            participantsAdult: 10,
            participantsDiscounted: 0,
            estimatedTravelExpensesCents: 0,
        });

        expect(tenPlus.suggestedOfferAmountCents).toBeLessThan(underTen.suggestedOfferAmountCents);
    });

    it('lowers soft bounds when travel expenses are high', () => {
        const noTravel = bookingRequestOfferPriceGuidance({
            priceClassType: 'MEDIUM',
            participantsAdult: 4,
            participantsDiscounted: 0,
            estimatedTravelExpensesCents: 0,
        });
        const withTravel = bookingRequestOfferPriceGuidance({
            priceClassType: 'MEDIUM',
            participantsAdult: 4,
            participantsDiscounted: 0,
            estimatedTravelExpensesCents: 8000,
        });

        expect(withTravel.suggestedOfferAmountCents).toBeLessThan(noTravel.suggestedOfferAmountCents);
        expect(withTravel.minOfferAmountCents!).toBeLessThan(noTravel.minOfferAmountCents!);
    });

    it('raises suggestion to platform €350 floor for tiny parties', () => {
        const result = bookingRequestOfferPriceGuidance({
            priceClassType: 'LOW',
            participantsAdult: 1,
            participantsDiscounted: 0,
            estimatedTravelExpensesCents: 0,
        });

        expect(result.suggestedOfferAmountCents).toBe(35000);
        expect(result.maxOfferAmountCents).toBe(Math.round(35000 * 1.2));
    });

    it('clears soft bounds and sets hard min when promo has a customer-total floor', () => {
        const result = bookingRequestOfferPriceGuidance({
            priceClassType: 'MEDIUM',
            participantsAdult: 4,
            participantsDiscounted: 0,
            estimatedTravelExpensesCents: 0,
            promoMinimumTotalAmountCustomerCents: 50_000,
        });

        expect(result.minOfferAmountCents).toBeNull();
        expect(result.maxOfferAmountCents).toBeNull();
        expect(result.minOfferAmountHardCents).toBe(50_000);
        expect(result.suggestedOfferAmountCents).toBe(12500);
    });

    it('defaults missing price class to MEDIUM', () => {
        const withNull = bookingRequestOfferPriceGuidance({
            priceClassType: null,
            participantsAdult: 4,
            participantsDiscounted: 0,
            estimatedTravelExpensesCents: 0,
        });
        const medium = bookingRequestOfferPriceGuidance({
            priceClassType: 'MEDIUM',
            participantsAdult: 4,
            participantsDiscounted: 0,
            estimatedTravelExpensesCents: 0,
        });

        expect(withNull).toEqual(medium);
    });
});
