import { describe, expect, it } from 'vitest';

import { bookingRequestOfferListBucketDerive, bookingRequestOfferStatusDerive, bookingRequestStatusDerive } from './bookingRequest';
import type { BookingRequestOfferStatus } from './bookingRequest';

describe('bookingRequestStatusDerive', () => {
    const eventDate = new Date('2026-10-01T18:00:00.000Z');
    const now = new Date('2026-09-01T12:00:00.000Z');

    it('returns CANCELED when canceledAt is set', () => {
        expect(
            bookingRequestStatusDerive({
                offerCount: 2,
                canceledAt: now,
                expiresAt: null,
                eventDate,
                now,
            }),
        ).toBe('CANCELED');
    });

    it('returns EXPIRED when past expiresAt without an accepted offer', () => {
        expect(
            bookingRequestStatusDerive({
                offerCount: 0,
                canceledAt: null,
                expiresAt: new Date('2026-08-01T00:00:00.000Z'),
                eventDate,
                now,
            }),
        ).toBe('EXPIRED');
    });

    it('returns WAITING_FOR_OFFERS with no offers', () => {
        expect(
            bookingRequestStatusDerive({
                offerCount: 0,
                canceledAt: null,
                expiresAt: null,
                eventDate,
                now,
            }),
        ).toBe('WAITING_FOR_OFFERS');
    });

    it('returns OFFERS_WAITING_FOR_REVIEW when offers exist but none accepted', () => {
        expect(
            bookingRequestStatusDerive({
                offerCount: 3,
                canceledAt: null,
                expiresAt: null,
                eventDate,
                now,
            }),
        ).toBe('OFFERS_WAITING_FOR_REVIEW');
    });

    it('maps accepted offer payment statuses through deposit → pull → event → completed', () => {
        expect(
            bookingRequestStatusDerive({
                offerCount: 1,
                acceptedOfferPaymentStatus: 'EMPTY',
                canceledAt: null,
                expiresAt: null,
                eventDate,
                now,
            }),
        ).toBe('DEPOSIT_PAYMENT_PENDING');

        expect(
            bookingRequestStatusDerive({
                offerCount: 1,
                acceptedOfferPaymentStatus: 'SETUP',
                canceledAt: null,
                expiresAt: null,
                eventDate,
                now,
            }),
        ).toBe('PAYMENT_PULL_PENDING');

        expect(
            bookingRequestStatusDerive({
                offerCount: 1,
                acceptedOfferPaymentStatus: 'PAYED',
                canceledAt: null,
                expiresAt: null,
                eventDate,
                now,
            }),
        ).toBe('EVENT_PENDING');

        expect(
            bookingRequestStatusDerive({
                offerCount: 1,
                acceptedOfferPaymentStatus: 'PAYED',
                canceledAt: null,
                expiresAt: null,
                eventDate,
                now: new Date('2026-10-02T00:00:00.000Z'),
            }),
        ).toBe('COMPLETED');
    });
});

describe('bookingRequestOfferStatusDerive', () => {
    const base = {
        userRequestedMenuAdjustments: null as boolean | null,
        paymentStatus: 'EMPTY' as const,
        paymentDataPresent: false,
        bookingRequestCanceledAt: null as Date | null,
        bookingRequestExpiresAt: null as Date | null,
        bookingRequestDateTime: new Date('2026-10-01T18:00:00.000Z'),
        hasAcceptedAlternative: false,
        now: new Date('2026-09-01T12:00:00.000Z'),
    };

    it('returns USER_NEEDS_TO_ACCEPT when cook accepted and user pending', () => {
        expect(
            bookingRequestOfferStatusDerive({
                ...base,
                userAccepted: null,
                cookAccepted: true,
            }),
        ).toBe('USER_NEEDS_TO_ACCEPT');
    });

    it('returns COOK_NEEDS_TO_ACCEPT when cook pending', () => {
        expect(
            bookingRequestOfferStatusDerive({
                ...base,
                userAccepted: true,
                cookAccepted: null,
            }),
        ).toBe('COOK_NEEDS_TO_ACCEPT');
    });

    it('returns USER_NEEDS_DEPOSIT_PAYMENT when dual-accepted without payment data', () => {
        expect(
            bookingRequestOfferStatusDerive({
                ...base,
                userAccepted: true,
                cookAccepted: true,
                paymentDataPresent: false,
            }),
        ).toBe('USER_NEEDS_DEPOSIT_PAYMENT');
    });

    it('returns USER_CHOOSE_DIFFERENT_OFFER when another offer was accepted', () => {
        expect(
            bookingRequestOfferStatusDerive({
                ...base,
                userAccepted: null,
                cookAccepted: true,
                hasAcceptedAlternative: true,
            }),
        ).toBe('USER_CHOOSE_DIFFERENT_OFFER');
    });

    it('returns COOK_DECLINED / USER_DECLINED from accept flags', () => {
        expect(
            bookingRequestOfferStatusDerive({
                ...base,
                userAccepted: null,
                cookAccepted: false,
            }),
        ).toBe('COOK_DECLINED');

        expect(
            bookingRequestOfferStatusDerive({
                ...base,
                userAccepted: false,
                cookAccepted: true,
            }),
        ).toBe('USER_DECLINED');
    });
});

describe('bookingRequestOfferListBucketDerive', () => {
    const cases: Array<[BookingRequestOfferStatus, 'ACTIVE' | 'COMPLETED' | 'ARCHIVED']> = [
        ['USER_NEEDS_TO_ACCEPT', 'ACTIVE'],
        ['COOK_NEEDS_TO_ACCEPT', 'ACTIVE'],
        ['USER_REQUESTED_MENU_CHANGES', 'ACTIVE'],
        ['USER_NEEDS_DEPOSIT_PAYMENT', 'ACTIVE'],
        ['PAYMENT_PULL_PENDING', 'ACTIVE'],
        ['EVENT_PENDING', 'ACTIVE'],
        ['COMPLETED', 'COMPLETED'],
        ['USER_DECLINED', 'ARCHIVED'],
        ['COOK_DECLINED', 'ARCHIVED'],
        ['USER_CHOOSE_DIFFERENT_OFFER', 'ARCHIVED'],
        ['EXPIRED', 'ARCHIVED'],
        ['CANCELED', 'ARCHIVED'],
    ];

    it.each(cases)('maps %s → %s', (status, bucket) => {
        expect(bookingRequestOfferListBucketDerive(status)).toBe(bucket);
    });
});
