import { describe, expect, it } from 'vitest';

import { bookingRequestOfferParticipantAmendmentPriceCalculate } from './bookingRequestOfferParticipantAmendmentPrice';

describe('bookingRequestOfferParticipantAmendmentPriceCalculate', () => {
    it('scales menu total by paid-headcount ratio and preserves discount cents', () => {
        const result = bookingRequestOfferParticipantAmendmentPriceCalculate(
            {
                menuPriceCentsBefore: 40_000,
                travelExpensesCents: 2_000,
                totalWithoutDiscountsCentsCustomerBefore: 45_000,
                totalCentsCustomerBefore: 40_000,
                participantsBefore: [{ type: 'ADULT' }, { type: 'ADULT' }, { type: 'ADULT' }, { type: 'ADULT' }],
                participantsAfter: [{ type: 'ADULT' }, { type: 'ADULT' }],
            },
            34_800,
        );

        expect(result.paidParticipantsBefore).toBe(4);
        expect(result.paidParticipantsAfter).toBe(2);
        expect(result.menuPriceCentsAfter).toBe(20_000);
        expect(result.customerDeltaCents).toBeLessThan(0);
        expect(result.cookPayoutDeltaCents).toBeLessThan(0);
        // 5000 discount from before is preserved against the new total before discounts
        expect(result.totalCentsCustomerAfter).toBe(Math.max(0, result.totalWithoutDiscountsCentsCustomerAfter - 5_000));
    });

    it('treats discounted participants as half a paid head', () => {
        const result = bookingRequestOfferParticipantAmendmentPriceCalculate(
            {
                menuPriceCentsBefore: 30_000,
                travelExpensesCents: 0,
                totalWithoutDiscountsCentsCustomerBefore: 32_000,
                totalCentsCustomerBefore: 32_000,
                participantsBefore: [{ type: 'ADULT' }, { type: 'ADULT' }, { type: 'DISCOUNTED' }, { type: 'DISCOUNTED' }],
                participantsAfter: [{ type: 'ADULT' }, { type: 'ADULT' }],
            },
            24_600,
        );

        expect(result.paidParticipantsBefore).toBe(3);
        expect(result.paidParticipantsAfter).toBe(2);
        expect(result.menuPriceCentsAfter).toBe(20_000);
    });
});
