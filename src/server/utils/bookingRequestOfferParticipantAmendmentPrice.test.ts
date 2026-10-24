import { describe, expect, it } from 'vitest';

import { bookingRequestOfferParticipantAmendmentPriceCalculate } from './bookingRequestOfferParticipantAmendmentPrice';

describe('bookingRequestOfferParticipantAmendmentPriceCalculate', () => {
    it('scales menu total by paid-headcount ratio and restores unused gift credit on decrease', () => {
        const result = bookingRequestOfferParticipantAmendmentPriceCalculate(
            {
                menuPriceCentsBefore: 40_000,
                travelExpensesCentsAfter: 2_000,
                totalWithoutDiscountsCentsCustomerBefore: 45_000,
                totalCentsCustomerBefore: 40_000,
                giftCardAppliedCentsBefore: 5_000,
                giftCardBalanceCents: 0,
                promoAmountCents: 0,
                participantsBefore: [{ type: 'ADULT' }, { type: 'ADULT' }, { type: 'ADULT' }, { type: 'ADULT' }],
                participantsAfter: [{ type: 'ADULT' }, { type: 'ADULT' }],
                platformFeePercentCook: 18,
                platformFeePercentCustomer: 4,
            },
            34_800,
        );

        expect(result.paidParticipantsBefore).toBe(4);
        expect(result.paidParticipantsAfter).toBe(2);
        expect(result.menuPriceCentsAfter).toBe(20_000);
        expect(result.customerDeltaCents).toBeLessThan(0);
        expect(result.cookPayoutDeltaCents).toBeLessThan(0);
        // Gift can cover up to previous applied; on lower total, gift applied shrinks and delta is negative (restore).
        expect(result.giftCardAppliedCentsAfter).toBeLessThanOrEqual(5_000);
        expect(result.giftCardDeltaCents).toBeLessThanOrEqual(0);
    });

    it('treats discounted participants as half a paid head', () => {
        const result = bookingRequestOfferParticipantAmendmentPriceCalculate(
            {
                menuPriceCentsBefore: 30_000,
                travelExpensesCentsAfter: 0,
                totalWithoutDiscountsCentsCustomerBefore: 32_000,
                totalCentsCustomerBefore: 32_000,
                giftCardAppliedCentsBefore: 0,
                giftCardBalanceCents: 0,
                promoAmountCents: 0,
                participantsBefore: [{ type: 'ADULT' }, { type: 'ADULT' }, { type: 'DISCOUNTED' }, { type: 'DISCOUNTED' }],
                participantsAfter: [{ type: 'ADULT' }, { type: 'ADULT' }],
                platformFeePercentCook: 18,
                platformFeePercentCustomer: 4,
            },
            24_600,
        );

        expect(result.paidParticipantsBefore).toBe(3);
        expect(result.paidParticipantsAfter).toBe(2);
        expect(result.menuPriceCentsAfter).toBe(20_000);
    });

    it('location-only keeps menu and updates travel', () => {
        const result = bookingRequestOfferParticipantAmendmentPriceCalculate(
            {
                menuPriceCentsBefore: 40_000,
                travelExpensesCentsAfter: 8_000,
                totalWithoutDiscountsCentsCustomerBefore: 45_000,
                totalCentsCustomerBefore: 45_000,
                giftCardAppliedCentsBefore: 0,
                giftCardBalanceCents: 0,
                promoAmountCents: 0,
                participantsBefore: [{ type: 'ADULT' }, { type: 'ADULT' }],
                participantsAfter: [{ type: 'ADULT' }, { type: 'ADULT' }],
                scaleMenuByParticipants: false,
                platformFeePercentCook: 18,
                platformFeePercentCustomer: 4,
            },
            34_800,
        );

        expect(result.menuPriceCentsAfter).toBe(40_000);
        expect(result.travelExpensesCents).toBe(8_000);
        expect(result.customerDeltaCents).toBeGreaterThan(0);
    });

    it('honors absolute menu override without scaling', () => {
        const result = bookingRequestOfferParticipantAmendmentPriceCalculate(
            {
                menuPriceCentsBefore: 40_000,
                travelExpensesCentsAfter: 2_000,
                totalWithoutDiscountsCentsCustomerBefore: 45_000,
                totalCentsCustomerBefore: 45_000,
                giftCardAppliedCentsBefore: 0,
                giftCardBalanceCents: 0,
                promoAmountCents: 0,
                participantsBefore: [{ type: 'ADULT' }, { type: 'ADULT' }],
                participantsAfter: [{ type: 'ADULT' }, { type: 'ADULT' }, { type: 'ADULT' }],
                scaleMenuByParticipants: true,
                menuPriceCentsOverride: 55_000,
                platformFeePercentCook: 18,
                platformFeePercentCustomer: 4,
            },
            34_800,
        );

        expect(result.menuPriceCentsAfter).toBe(55_000);
        expect(result.paidParticipantsAfter).toBe(3);
    });

    it('keeps sticky platform fee percents instead of marketplace defaults', () => {
        const result = bookingRequestOfferParticipantAmendmentPriceCalculate(
            {
                menuPriceCentsBefore: 20_000,
                travelExpensesCentsAfter: 2_500,
                totalWithoutDiscountsCentsCustomerBefore: 24_000,
                totalCentsCustomerBefore: 24_000,
                giftCardAppliedCentsBefore: 0,
                giftCardBalanceCents: 0,
                promoAmountCents: 0,
                participantsBefore: [{ type: 'ADULT' }, { type: 'ADULT' }],
                participantsAfter: [{ type: 'ADULT' }, { type: 'ADULT' }],
                scaleMenuByParticipants: false,
                platformFeePercentCook: 10,
                platformFeePercentCustomer: 2,
            },
            20_500,
        );

        expect(result.platformFeePercentCook).toBe(10);
        expect(result.platformFeePercentCustomer).toBe(2);
        expect(result.platformFeeCentsCook).toBe(2_000);
        expect(result.platformFeeCentsCustomer).toBe(400);
        expect(result.payoutCentsCookAfter).toBe(20_500);
    });
});
