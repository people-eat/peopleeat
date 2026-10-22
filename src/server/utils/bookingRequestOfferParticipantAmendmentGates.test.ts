import { describe, expect, it } from 'vitest';

import {
    bookingRequestOfferCanCompletePreparations,
    bookingRequestOfferCanRequestParticipantAmendment,
} from './bookingRequestOfferParticipantAmendmentGates';

const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const past = new Date(Date.now() - 24 * 60 * 60 * 1000);

describe('bookingRequestOfferCanRequestParticipantAmendment', () => {
    it('allows dual-accepted paid offers before the event when unlocked', () => {
        expect(
            bookingRequestOfferCanRequestParticipantAmendment({
                offer: {
                    userAccepted: true,
                    cookAccepted: true,
                    paymentStatus: 'PAYED',
                    paymentData: { paymentIntentId: 'pi_1', clientSecret: 'sec' },
                    preparationsCompletedAt: null,
                    participantAmendment: null,
                },
                bookingRequest: { dateTime: future, canceledAt: null },
            }),
        ).toBe(true);
    });

    it('blocks when preparations are completed', () => {
        expect(
            bookingRequestOfferCanRequestParticipantAmendment({
                offer: {
                    userAccepted: true,
                    cookAccepted: true,
                    paymentStatus: 'PAYED',
                    paymentData: { paymentIntentId: 'pi_1', clientSecret: 'sec' },
                    preparationsCompletedAt: new Date(),
                    participantAmendment: null,
                },
                bookingRequest: { dateTime: future, canceledAt: null },
            }),
        ).toBe(false);
    });

    it('blocks TRANSFERRED and past events', () => {
        expect(
            bookingRequestOfferCanRequestParticipantAmendment({
                offer: {
                    userAccepted: true,
                    cookAccepted: true,
                    paymentStatus: 'TRANSFERRED',
                    paymentData: null,
                    preparationsCompletedAt: null,
                    participantAmendment: null,
                },
                bookingRequest: { dateTime: future, canceledAt: null },
            }),
        ).toBe(false);
        expect(
            bookingRequestOfferCanRequestParticipantAmendment({
                offer: {
                    userAccepted: true,
                    cookAccepted: true,
                    paymentStatus: 'PAYED',
                    paymentData: null,
                    preparationsCompletedAt: null,
                    participantAmendment: null,
                },
                bookingRequest: { dateTime: past, canceledAt: null },
            }),
        ).toBe(false);
    });

    it('blocks when a pending delta payment is unpaid', () => {
        expect(
            bookingRequestOfferCanRequestParticipantAmendment({
                offer: {
                    userAccepted: true,
                    cookAccepted: true,
                    paymentStatus: 'PAYED',
                    paymentData: {
                        paymentIntentId: 'pi_1',
                        clientSecret: 'sec',
                        pendingDeltaPayment: {
                            paymentIntentId: 'pi_delta',
                            clientSecret: 'delta_sec',
                            amountCents: 1_000,
                            cookPayoutDeltaCents: 2_000,
                        },
                    },
                    preparationsCompletedAt: null,
                    participantAmendment: null,
                },
                bookingRequest: { dateTime: future, canceledAt: null },
            }),
        ).toBe(false);
    });
});

describe('bookingRequestOfferCanCompletePreparations', () => {
    it('allows when dual-accepted, unlocked, and no pending amendment', () => {
        expect(
            bookingRequestOfferCanCompletePreparations({
                offer: {
                    userAccepted: true,
                    cookAccepted: true,
                    preparationsCompletedAt: null,
                    participantAmendment: null,
                },
                bookingRequest: { dateTime: future, canceledAt: null },
            }),
        ).toBe(true);
    });

    it('blocks when an amendment is pending', () => {
        expect(
            bookingRequestOfferCanCompletePreparations({
                offer: {
                    userAccepted: true,
                    cookAccepted: true,
                    preparationsCompletedAt: null,
                    participantAmendment: {
                        amendmentApplyId: 'amend_1',
                        requestedAt: new Date().toISOString(),
                        participants: [{ type: 'ADULT', name: 'A', restrictions: [] }],
                        menuPriceCentsBefore: 1,
                        travelExpensesCentsBefore: 0,
                        totalCentsCustomerBefore: 1,
                        payoutCentsCookBefore: 1,
                    },
                },
                bookingRequest: { dateTime: future, canceledAt: null },
            }),
        ).toBe(false);
    });
});
