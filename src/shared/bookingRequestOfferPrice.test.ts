import { describe, expect, it } from 'vitest';

import { bookingRequestOfferPriceCalculate, bookingRequestSuggestedCookPayoutCents } from './bookingRequestOfferPrice';

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
