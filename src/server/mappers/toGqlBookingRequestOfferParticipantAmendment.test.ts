import { describe, expect, it } from 'vitest';

import type { BookingRequestOfferParticipantAmendment } from '../domain/bookingRequest';
import { toGqlBookingRequestOfferParticipantAmendment } from './toGqlBookingRequestOfferParticipantAmendment';

describe('toGqlBookingRequestOfferParticipantAmendment', () => {
    it('falls back to offer travel when legacy pending JSON omits travelExpensesCentsBefore', () => {
        const amendment: BookingRequestOfferParticipantAmendment = {
            amendmentApplyId: 'amend-1',
            requestedAt: '2026-10-01T12:00:00.000Z',
            participants: [{ type: 'ADULT', name: 'A', restrictions: [] }],
            menuPriceCentsBefore: 40_000,
            totalCentsCustomerBefore: 45_000,
            payoutCentsCookBefore: 34_800,
        };

        const gql = toGqlBookingRequestOfferParticipantAmendment({
            amendment,
            offer: {
                menuPriceCents: 40_000,
                travelExpensesCents: 2_500,
                totalWithoutDiscountsCentsCustomer: 45_000,
                totalCentsCustomer: 45_000,
                payoutCentsCook: 34_800,
                giftCardAppliedCents: 0,
                platformFeePercentCook: 18,
                platformFeePercentCustomer: 4,
            },
            currentParticipants: [
                { type: 'ADULT', name: 'A', restrictions: [] },
                { type: 'ADULT', name: 'B', restrictions: [] },
            ],
        });

        expect(gql.travelExpensesCentsBefore).toBe(2_500);
        expect(gql.travelExpensesCentsAfter).toBe(2_500);
    });
});
