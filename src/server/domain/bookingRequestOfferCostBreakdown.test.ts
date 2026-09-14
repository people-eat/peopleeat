import { describe, expect, it } from 'vitest';

import { bookingRequestOfferCostBreakdownBuild } from './bookingRequestOfferCostBreakdown';

describe('bookingRequestOfferCostBreakdownBuild', () => {
    it('builds menu + fees line items and a total', () => {
        const breakdown = bookingRequestOfferCostBreakdownBuild({
            locale: 'en',
            menuPriceCents: 20_000,
            travelExpensesCents: 2_500,
            platformFeeCentsCustomer: 1_000,
            paymentProviderFeeCents: 500,
            totalWithoutDiscountsCentsCustomer: 24_000,
        });

        expect(breakdown.lineItems).toEqual([
            { title: 'Menu price', amountCents: 22_500 },
            { title: 'Service fees', amountCents: 1_500 },
        ]);
        expect(breakdown.total).toEqual({ title: 'Total price', amountCents: 24_000 });
        expect(breakdown.totalBeforeDiscount).toBeNull();
        expect(breakdown.totalPerPerson).toBeNull();
    });

    it('applies promo and gift-card discounts and exposes totalBeforeDiscount', () => {
        const breakdown = bookingRequestOfferCostBreakdownBuild({
            locale: 'de',
            menuPriceCents: 20_000,
            travelExpensesCents: 0,
            platformFeeCentsCustomer: 0,
            paymentProviderFeeCents: 0,
            totalWithoutDiscountsCentsCustomer: 20_000,
            promoCode: { redeemCode: 'SAVE10', amountCents: 1_000 },
            giftCard: { redeemCode: 'GIFT-1', balanceCents: 2_500 },
            participantCount: 4,
        });

        expect(breakdown.lineItems.at(-2)?.amountCents).toBe(-1_000);
        expect(breakdown.lineItems.at(-1)?.amountCents).toBe(-2_500);
        expect(breakdown.totalBeforeDiscount?.amountCents).toBe(20_000);
        expect(breakdown.total?.amountCents).toBe(16_500);
        expect(breakdown.totalPerPerson?.amountCents).toBe(4_125);
    });
});
