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
                paymentStatus: 'PAYED',
            },
            currentParticipants: [
                { type: 'ADULT', name: 'A', restrictions: [] },
                { type: 'ADULT', name: 'B', restrictions: [] },
            ],
        });

        expect(gql.travelExpensesCentsBefore).toBe(2_500);
        expect(gql.travelExpensesCentsAfter).toBe(2_500);
    });

    it('uses persisted travelExpensesCentsAfter for venue proposals so host-price totals change', () => {
        const amendment: BookingRequestOfferParticipantAmendment = {
            amendmentApplyId: 'amend-2',
            requestedAt: '2026-10-01T12:00:00.000Z',
            exactEventAddress: {
                displayText: 'Nearby',
                latitude: 52.53,
                longitude: 13.41,
                addressLine1: 'Nearby 1',
                addressLine2: '',
                city: 'Berlin',
                postCode: '10115',
                state: 'BE',
                country: 'DE',
            },
            menuPriceCentsBefore: 40_000,
            travelExpensesCentsBefore: 2_000,
            travelExpensesCentsAfter: 500,
            totalCentsCustomerBefore: 45_000,
            payoutCentsCookBefore: 34_800,
        };

        const gql = toGqlBookingRequestOfferParticipantAmendment({
            amendment,
            offer: {
                menuPriceCents: 40_000,
                travelExpensesCents: 2_000,
                totalWithoutDiscountsCentsCustomer: 45_000,
                totalCentsCustomer: 45_000,
                payoutCentsCook: 34_800,
                giftCardAppliedCents: 0,
                platformFeePercentCook: 18,
                platformFeePercentCustomer: 4,
                paymentStatus: 'PAYED',
            },
            currentParticipants: [
                { type: 'ADULT', name: 'A', restrictions: [] },
                { type: 'ADULT', name: 'B', restrictions: [] },
                { type: 'ADULT', name: 'C', restrictions: [] },
                { type: 'ADULT', name: 'D', restrictions: [] },
            ],
        });

        expect(gql.travelExpensesCentsAfter).toBe(500);
        expect(gql.totalCentsCustomerAfter).toBeLessThan(gql.totalCentsCustomerBefore);
    });

    it('rounds PAYED sub-minimum host-price increases up to Stripe floor', () => {
        const amendment: BookingRequestOfferParticipantAmendment = {
            amendmentApplyId: 'amend-3',
            requestedAt: '2026-10-01T12:00:00.000Z',
            exactEventAddress: {
                displayText: 'Nearby',
                latitude: 52.53,
                longitude: 13.41,
                addressLine1: 'Nearby 1',
                addressLine2: '',
                city: 'Berlin',
                postCode: '10115',
                state: 'BE',
                country: 'DE',
            },
            menuPriceCentsBefore: 40_000,
            travelExpensesCentsBefore: 2_000,
            travelExpensesCentsAfter: 2_010,
            totalCentsCustomerBefore: 44_289,
            payoutCentsCookBefore: 34_800,
        };

        const gql = toGqlBookingRequestOfferParticipantAmendment({
            amendment,
            offer: {
                menuPriceCents: 40_000,
                travelExpensesCents: 2_000,
                totalWithoutDiscountsCentsCustomer: 44_289,
                totalCentsCustomer: 44_289,
                payoutCentsCook: 34_800,
                giftCardAppliedCents: 0,
                platformFeePercentCook: 18,
                platformFeePercentCustomer: 4,
                paymentStatus: 'PAYED',
            },
            currentParticipants: [
                { type: 'ADULT', name: 'A', restrictions: [] },
                { type: 'ADULT', name: 'B', restrictions: [] },
                { type: 'ADULT', name: 'C', restrictions: [] },
                { type: 'ADULT', name: 'D', restrictions: [] },
            ],
        });

        expect(gql.totalCentsCustomerAfter - gql.totalCentsCustomerBefore).toBe(50);
    });
});
