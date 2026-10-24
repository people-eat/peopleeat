import { describe, expect, it } from 'vitest';

import {
    bookingRequestOfferMenuPriceScaleByPaidParticipants,
    bookingRequestOfferPriceCalculate,
    bookingRequestSuggestedCookPayoutCents,
} from './bookingRequestOfferPrice';

describe('bookingRequestOfferPriceCalculate', () => {
    it('applies 18%/4% platform fees and Stripe-style gross-up', () => {
        const result = bookingRequestOfferPriceCalculate({
            menuPriceCents: 20_000,
            travelExpensesCents: 2_500,
        });

        expect(result.platformFeePercentCook).toBe(18);
        expect(result.platformFeePercentCustomer).toBe(4);
        expect(result.platformFeeCentsCook).toBe(3_600);
        expect(result.platformFeeCentsCustomer).toBe(800);
        expect(result.payoutCentsCook).toBe(18_900);
        expect(result.totalWithoutDiscountsCentsCustomer).toBeGreaterThan(20_000 + 800 + 2_500);
        expect(result.paymentProviderFeeCents).toBe(result.totalWithoutDiscountsCentsCustomer - (20_000 + 800 + 2_500));
    });

    it('applies sticky per-offer platform fee percent overrides', () => {
        const result = bookingRequestOfferPriceCalculate({
            menuPriceCents: 20_000,
            travelExpensesCents: 2_500,
            platformFeePercentCook: 10,
            platformFeePercentCustomer: 2,
        });

        expect(result.platformFeePercentCook).toBe(10);
        expect(result.platformFeePercentCustomer).toBe(2);
        expect(result.platformFeeCentsCook).toBe(2_000);
        expect(result.platformFeeCentsCustomer).toBe(400);
        expect(result.payoutCentsCook).toBe(20_500);
        expect(result.paymentProviderFeeCents).toBe(result.totalWithoutDiscountsCentsCustomer - (20_000 + 400 + 2_500));
    });

    it('rejects non-integer or out-of-range fee percents', () => {
        expect(() =>
            bookingRequestOfferPriceCalculate({
                menuPriceCents: 20_000,
                travelExpensesCents: 0,
                platformFeePercentCook: -1,
            }),
        ).toThrow(/platform fee percent/);
        expect(() =>
            bookingRequestOfferPriceCalculate({
                menuPriceCents: 20_000,
                travelExpensesCents: 0,
                platformFeePercentCustomer: 10.5,
            }),
        ).toThrow(/platform fee percent/);
        expect(() =>
            bookingRequestOfferPriceCalculate({
                menuPriceCents: 20_000,
                travelExpensesCents: 0,
                platformFeePercentCook: 101,
            }),
        ).toThrow(/platform fee percent/);
    });
});

describe('bookingRequestSuggestedCookPayoutCents', () => {
    it('prices suggested per-person × paid participants and adds travel after cook fee', () => {
        // 4 adults + 2 kids (half) = 5 paid → menu 5 × 9400 = 47_000; cook fee 18% → payout 38_540 + 2_500 travel
        expect(
            bookingRequestSuggestedCookPayoutCents({
                suggestedOfferAmountCents: 9400,
                participantsAdult: 4,
                participantsDiscounted: 2,
                estimatedTravelExpensesCents: 2_500,
            }),
        ).toBe(41_040);
    });
});

describe('bookingRequestOfferMenuPriceScaleByPaidParticipants', () => {
    it('scales menu by paid-headcount ratio', () => {
        expect(
            bookingRequestOfferMenuPriceScaleByPaidParticipants({
                menuPriceCents: 20_000,
                paidParticipantsBefore: 4,
                paidParticipantsAfter: 2,
            }),
        ).toBe(10_000);
    });

    it('rejects non-positive paid headcounts', () => {
        expect(() =>
            bookingRequestOfferMenuPriceScaleByPaidParticipants({
                menuPriceCents: 20_000,
                paidParticipantsBefore: 0,
                paidParticipantsAfter: 2,
            }),
        ).toThrow(/paidParticipantsBefore/);
    });
});
