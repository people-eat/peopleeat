import { describe, expect, it } from 'vitest';

import type { UserAttentionRequest } from './userAttention';
import { userAttentionDerive } from './userAttention';

type Offer = UserAttentionRequest['offers'][number];
type CallBooking = Offer['callBookings'][number];

function offerFixture(overrides: Partial<Offer> = {}): Offer {
    return {
        bookingRequestOfferId: 'offer-1',
        status: 'USER_NEEDS_TO_ACCEPT',
        userUnreadNotificationCount: 0,
        testimonialMissing: false,
        callBookings: [],
        ...overrides,
    };
}

function requestFixture(overrides: Partial<UserAttentionRequest> = {}): UserAttentionRequest {
    return {
        bookingRequestId: 'req-1',
        status: 'WAITING_FOR_OFFERS',
        occasion: 'Birthday',
        dateTime: new Date('2026-12-01T18:00:00.000Z'),
        offers: [],
        ...overrides,
    };
}

function call(overrides: Partial<CallBooking> = {}): CallBooking {
    return {
        startAt: new Date('2099-06-01T16:00:00.000Z'),
        endAt: new Date('2099-06-01T16:15:00.000Z'),
        status: 'PENDING',
        initiator: 'COOK',
        ...overrides,
    };
}

describe('userAttentionDerive', () => {
    it('returns nothing when no request needs action', () => {
        // Arrange
        const requests = [requestFixture({ status: 'EVENT_PENDING' }), requestFixture({ bookingRequestId: 'req-2' })];

        // Act
        const items = userAttentionDerive(requests);

        // Assert
        expect(items).toEqual([]);
    });

    it('ranks offers to review, payment, and unread chat in that order', () => {
        // Arrange
        const requests = [
            requestFixture({
                bookingRequestId: 'req-review',
                status: 'OFFERS_WAITING_FOR_REVIEW',
                occasion: 'Friends night',
                offers: [offerFixture({ userUnreadNotificationCount: 2 })],
            }),
            requestFixture({
                bookingRequestId: 'req-pay',
                status: 'DEPOSIT_PAYMENT_PENDING',
                occasion: 'Team dinner',
                dateTime: new Date('2026-11-01T18:00:00.000Z'),
                offers: [offerFixture({ bookingRequestOfferId: 'offer-pay', status: 'USER_NEEDS_DEPOSIT_PAYMENT' })],
            }),
        ];

        // Act
        const items = userAttentionDerive(requests);

        // Assert
        expect(items.map((item) => item.kind)).toEqual(['OFFERS_TO_REVIEW', 'PAYMENT_DUE', 'OFFER_CHAT_UNREAD']);
        expect(items[0]).toMatchObject({ count: 1, bookingRequestId: 'req-review', bookingRequestOfferId: null });
        expect(items[1]).toMatchObject({ bookingRequestId: 'req-pay', bookingRequestOfferId: 'offer-pay', occasion: 'Team dinner' });
        expect(items[2]).toMatchObject({ count: 2, bookingRequestId: 'req-review', bookingRequestOfferId: 'offer-1' });
    });

    it('counts all requests with offers to review and targets the soonest', () => {
        // Arrange
        const requests = [
            requestFixture({
                bookingRequestId: 'req-later',
                status: 'OFFERS_WAITING_FOR_REVIEW',
                dateTime: new Date('2026-11-20T18:00:00Z'),
            }),
            requestFixture({
                bookingRequestId: 'req-sooner',
                status: 'OFFERS_WAITING_FOR_REVIEW',
                dateTime: new Date('2026-11-10T18:00:00Z'),
            }),
        ];

        // Act
        const [item] = userAttentionDerive(requests);

        // Assert
        expect(item).toMatchObject({ kind: 'OFFERS_TO_REVIEW', count: 2, bookingRequestId: 'req-sooner' });
    });

    it('sums unread messages and targets the first offer with the most', () => {
        // Arrange
        const requests = [
            requestFixture({
                bookingRequestId: 'req-a',
                offers: [
                    offerFixture({ bookingRequestOfferId: 'offer-a1', userUnreadNotificationCount: 1 }),
                    offerFixture({ bookingRequestOfferId: 'offer-a2', userUnreadNotificationCount: 3 }),
                ],
            }),
            requestFixture({
                bookingRequestId: 'req-b',
                offers: [offerFixture({ bookingRequestOfferId: 'offer-b', userUnreadNotificationCount: 3 })],
            }),
        ];

        // Act
        const [item] = userAttentionDerive(requests);

        // Assert
        expect(item).toMatchObject({ kind: 'OFFER_CHAT_UNREAD', count: 7, bookingRequestId: 'req-a', bookingRequestOfferId: 'offer-a2' });
    });

    it('prefers a call awaiting the customer over earlier requests with pending or confirmed calls', () => {
        // Arrange
        const requests = [
            requestFixture({
                bookingRequestId: 'req-confirmed',
                offers: [offerFixture({ bookingRequestOfferId: 'offer-confirmed', callBookings: [call({ status: 'CONFIRMED' })] })],
            }),
            requestFixture({
                bookingRequestId: 'req-incoming',
                offers: [
                    offerFixture({ bookingRequestOfferId: 'offer-outgoing', callBookings: [call({ initiator: 'CUSTOMER' })] }),
                    offerFixture({ bookingRequestOfferId: 'offer-incoming', callBookings: [call({ initiator: 'COOK' })] }),
                ],
            }),
        ];

        // Act
        const [item] = userAttentionDerive(requests);

        // Assert
        expect(item).toMatchObject({
            kind: 'CALL_RESPONSE_NEEDED',
            bookingRequestId: 'req-incoming',
            bookingRequestOfferId: 'offer-incoming',
            callStartAt: new Date('2099-06-01T16:00:00.000Z'),
            callEndAt: new Date('2099-06-01T16:15:00.000Z'),
        });
    });

    it('falls back to the first request with any call and ignores declined calls', () => {
        // Arrange
        const requests = [
            requestFixture({ bookingRequestId: 'req-declined', offers: [offerFixture({ callBookings: [call({ status: 'DECLINED' })] })] }),
            requestFixture({
                bookingRequestId: 'req-pending',
                offers: [offerFixture({ callBookings: [call({ initiator: 'CUSTOMER' })] })],
            }),
            requestFixture({
                bookingRequestId: 'req-confirmed',
                offers: [offerFixture({ callBookings: [call({ status: 'CONFIRMED' })] })],
            }),
        ];

        // Act
        const items = userAttentionDerive(requests);

        // Assert
        expect(items).toHaveLength(1);
        expect(items[0]).toMatchObject({ kind: 'CALL_PENDING', bookingRequestId: 'req-pending' });
    });

    it('asks for the review of the most recent completed dinner', () => {
        // Arrange
        const requests = [
            requestFixture({
                bookingRequestId: 'req-old',
                status: 'COMPLETED',
                dateTime: new Date('2025-01-01T18:00:00Z'),
                offers: [offerFixture({ bookingRequestOfferId: 'offer-old', status: 'COMPLETED', testimonialMissing: true })],
            }),
            requestFixture({
                bookingRequestId: 'req-recent',
                status: 'COMPLETED',
                occasion: 'Past dinner',
                dateTime: new Date('2026-01-01T18:00:00Z'),
                offers: [offerFixture({ bookingRequestOfferId: 'offer-recent', status: 'COMPLETED', testimonialMissing: true })],
            }),
        ];

        // Act
        const items = userAttentionDerive(requests);

        // Assert
        expect(items).toEqual([
            {
                kind: 'TESTIMONIAL_MISSING',
                count: 1,
                bookingRequestId: 'req-recent',
                bookingRequestOfferId: 'offer-recent',
                occasion: 'Past dinner',
                callStartAt: null,
                callEndAt: null,
            },
        ]);
    });
});
