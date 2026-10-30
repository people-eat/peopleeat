import { describe, expect, it } from 'vitest';

import { DEFAULT_TIME_ZONE } from '../../shared';
import type { CustomerOverviewAttention, CustomerOverviewRequest } from './profilePageCustomerOverview';
import { profilePageCustomerOverview } from './profilePageCustomerOverview';

function requestFixture(overrides: Partial<CustomerOverviewRequest> = {}): CustomerOverviewRequest {
    return {
        bookingRequestId: 'req-1',
        status: 'WAITING_FOR_OFFERS',
        occasion: 'Birthday',
        dateTime: '2026-12-01T18:00:00.000Z',
        exactEventAddress: {
            displayText: 'Berlin',
            city: 'Berlin',
        },
        ...overrides,
    };
}

function attentionFixture(overrides: Partial<CustomerOverviewAttention>): CustomerOverviewAttention {
    return {
        kind: 'OFFERS_TO_REVIEW',
        count: 1,
        bookingRequestId: 'req-1',
        bookingRequestOfferId: null,
        occasion: 'Birthday',
        callStartAt: null,
        callEndAt: null,
        ...overrides,
    };
}

describe('profilePageCustomerOverview', () => {
    it('shows primary create and getting started when there are no requests', () => {
        // Act
        const overview = profilePageCustomerOverview([], [], 'en', DEFAULT_TIME_ZONE);

        // Assert
        expect(overview.createMode).toBe('primary');
        expect(overview.gettingStarted.map((step) => step.key)).toEqual(['first-request']);
        expect(overview.attention).toEqual([]);
        expect(overview.nextDinner).toBeNull();
        expect(overview.allClear).toBe(false);
    });

    it('inlines the item targeting the next dinner and hides create when action is needed', () => {
        // Arrange
        const requests = [
            requestFixture({ bookingRequestId: 'req-review', status: 'OFFERS_WAITING_FOR_REVIEW', dateTime: '2026-12-01T18:00:00.000Z' }),
            requestFixture({ bookingRequestId: 'req-pay', status: 'DEPOSIT_PAYMENT_PENDING', dateTime: '2026-11-01T18:00:00.000Z' }),
        ];
        const attention = [
            attentionFixture({ kind: 'OFFERS_TO_REVIEW', bookingRequestId: 'req-review' }),
            attentionFixture({
                kind: 'PAYMENT_DUE',
                bookingRequestId: 'req-pay',
                bookingRequestOfferId: 'offer-pay',
                occasion: 'Team dinner',
            }),
            attentionFixture({ kind: 'OFFER_CHAT_UNREAD', count: 2, bookingRequestId: 'req-review', bookingRequestOfferId: 'offer-1' }),
        ];

        // Act
        const overview = profilePageCustomerOverview(requests, attention, 'en', DEFAULT_TIME_ZONE);

        // Assert
        expect(overview.nextDinner?.bookingRequestId).toBe('req-pay');
        expect(overview.nextDinner?.inlineAttention).toMatchObject({
            kind: 'PAYMENT_DUE',
            body: 'Team dinner: add your payment details to confirm the dinner.',
            target: { kind: 'checkout', bookingRequestId: 'req-pay', bookingRequestOfferId: 'offer-pay' },
        });
        expect(overview.attention.map((item) => item.kind)).toEqual(['OFFERS_TO_REVIEW', 'OFFER_CHAT_UNREAD']);
        expect(overview.attention[1]?.target).toEqual({
            kind: 'offer',
            bookingRequestId: 'req-review',
            bookingRequestOfferId: 'offer-1',
            search: { tab: 'chat' },
        });
        expect(overview.createMode).toBe('hidden');
        expect(overview.allClear).toBe(false);
        expect(overview.gettingStarted).toEqual([]);
    });

    it('keeps multi-request offers-to-review as standalone attention', () => {
        // Arrange
        const requests = [
            requestFixture({ bookingRequestId: 'req-a', status: 'OFFERS_WAITING_FOR_REVIEW', dateTime: '2026-11-10T18:00:00.000Z' }),
            requestFixture({ bookingRequestId: 'req-b', status: 'OFFERS_WAITING_FOR_REVIEW', dateTime: '2026-11-20T18:00:00.000Z' }),
        ];

        // Act
        const overview = profilePageCustomerOverview(
            requests,
            [attentionFixture({ count: 2, bookingRequestId: 'req-a' })],
            'en',
            DEFAULT_TIME_ZONE,
        );

        // Assert
        expect(overview.nextDinner?.inlineAttention).toBeNull();
        expect(overview.attention).toHaveLength(1);
        expect(overview.attention[0]).toMatchObject({ title: '2 requests with offers to review', target: { kind: 'requests' } });
    });

    it('caps attention at three items before folding', () => {
        // Arrange
        const attention = [
            attentionFixture({ kind: 'OFFERS_TO_REVIEW', count: 2, bookingRequestId: 'req-x' }),
            attentionFixture({ kind: 'PAYMENT_DUE', bookingRequestId: 'req-x', bookingRequestOfferId: 'o-1' }),
            attentionFixture({ kind: 'OFFER_CHAT_UNREAD', bookingRequestId: 'req-x', bookingRequestOfferId: 'o-2' }),
            attentionFixture({ kind: 'TESTIMONIAL_MISSING', bookingRequestId: 'req-x', bookingRequestOfferId: 'o-3' }),
        ];

        // Act
        const overview = profilePageCustomerOverview([requestFixture({ status: 'EVENT_PENDING' })], attention, 'en', DEFAULT_TIME_ZONE);

        // Assert
        expect(overview.attention.map((item) => item.kind)).toEqual(['OFFERS_TO_REVIEW', 'PAYMENT_DUE', 'OFFER_CHAT_UNREAD']);
    });

    it('opens the call and testimonial tabs for those kinds', () => {
        // Arrange
        const attention = [
            attentionFixture({
                kind: 'CALL_RESPONSE_NEEDED',
                bookingRequestId: 'req-x',
                bookingRequestOfferId: 'offer-call',
                callStartAt: '2099-06-01T16:00:00.000Z',
                callEndAt: '2099-06-01T16:15:00.000Z',
            }),
            attentionFixture({ kind: 'TESTIMONIAL_MISSING', bookingRequestId: 'req-y', bookingRequestOfferId: 'offer-review' }),
        ];

        // Act
        const overview = profilePageCustomerOverview([requestFixture({ status: 'EVENT_PENDING' })], attention, 'en', DEFAULT_TIME_ZONE);

        // Assert
        expect(overview.attention[0]).toMatchObject({ tone: 'warning', target: { search: { tab: 'call' } } });
        expect(overview.attention[0]?.body).toMatch(/^Call suggestion awaiting your response · /);
        expect(overview.attention[1]).toMatchObject({ tone: 'info', target: { search: { tab: 'testimonial' } } });
    });

    it('returns next dinner, secondary create, and allClear when nothing needs attention', () => {
        // Arrange
        const requests = [
            requestFixture({ status: 'EVENT_PENDING', dateTime: '2026-12-15T19:00:00.000Z' }),
            requestFixture({ bookingRequestId: 'req-2', dateTime: '2026-11-20T11:00:00.000Z' }),
        ];

        // Act
        const overview = profilePageCustomerOverview(requests, [], 'de', DEFAULT_TIME_ZONE);

        // Assert
        expect(overview.attention).toEqual([]);
        expect(overview.createMode).toBe('secondary');
        expect(overview.allClear).toBe(true);
        expect(overview.nextDinner?.bookingRequestId).toBe('req-2');
        expect(overview.nextDinner?.inlineAttention).toBeNull();
    });
});
