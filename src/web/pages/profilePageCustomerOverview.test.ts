import { describe, expect, it } from 'vitest';

import { DEFAULT_TIME_ZONE } from '../../shared';
import type { CustomerOverviewRequest } from './profilePageCustomerOverview';
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
        offers: [],
        ...overrides,
    };
}

describe('profilePageCustomerOverview', () => {
    it('shows primary create and getting started when there are no requests', () => {
        const overview = profilePageCustomerOverview([], 'en', DEFAULT_TIME_ZONE);
        expect(overview.createMode).toBe('primary');
        expect(overview.gettingStarted.map((step) => step.key)).toEqual(['first-request']);
        expect(overview.attention).toEqual([]);
        expect(overview.nextDinner).toBeNull();
        expect(overview.allClear).toBe(false);
    });

    it('surfaces ranked attention and hides create when action is needed', () => {
        const overview = profilePageCustomerOverview(
            [
                requestFixture({
                    bookingRequestId: 'req-review',
                    status: 'OFFERS_WAITING_FOR_REVIEW',
                    occasion: 'Friends night',
                    dateTime: '2026-12-01T18:00:00.000Z',
                    offers: [
                        {
                            bookingRequestOfferId: 'offer-1',
                            status: 'OPEN',
                            userUnreadNotificationCount: 2,
                            testimonialMissing: false,
                            callBookings: [],
                        },
                    ],
                }),
                requestFixture({
                    bookingRequestId: 'req-pay',
                    status: 'DEPOSIT_PAYMENT_PENDING',
                    occasion: 'Team dinner',
                    dateTime: '2026-11-01T18:00:00.000Z',
                    offers: [
                        {
                            bookingRequestOfferId: 'offer-pay',
                            status: 'USER_NEEDS_DEPOSIT_PAYMENT',
                            userUnreadNotificationCount: 0,
                            testimonialMissing: false,
                            callBookings: [],
                        },
                    ],
                }),
            ],
            'en',
            DEFAULT_TIME_ZONE,
        );

        // Next dinner is the sooner active request (req-pay); payment-due inlines onto it.
        expect(overview.nextDinner?.bookingRequestId).toBe('req-pay');
        expect(overview.nextDinner?.inlineAttention?.key).toBe('payment-due');
        expect(overview.attention.map((item) => item.key)).toEqual(['offers-to-review', 'unread-offers']);
        expect(overview.attention.find((item) => item.key === 'unread-offers')?.target).toEqual({
            kind: 'offer',
            bookingRequestId: 'req-review',
            bookingRequestOfferId: 'offer-1',
            search: { tab: 'chat' },
        });
        expect(overview.createMode).toBe('hidden');
        expect(overview.allClear).toBe(false);
        expect(overview.gettingStarted).toEqual([]);
    });

    it('inlines offers-to-review onto next dinner when it targets that request', () => {
        const overview = profilePageCustomerOverview(
            [
                requestFixture({
                    bookingRequestId: 'req-review',
                    status: 'OFFERS_WAITING_FOR_REVIEW',
                    occasion: 'Friends night',
                    dateTime: '2026-11-14T18:00:00.000Z',
                    exactEventAddress: { displayText: 'Ebertsheim', city: 'Ebertsheim' },
                    offers: [
                        {
                            bookingRequestOfferId: 'offer-1',
                            status: 'OPEN',
                            userUnreadNotificationCount: 0,
                            testimonialMissing: false,
                            callBookings: [],
                        },
                    ],
                }),
            ],
            'de',
            DEFAULT_TIME_ZONE,
        );

        expect(overview.nextDinner?.bookingRequestId).toBe('req-review');
        expect(overview.nextDinner?.inlineAttention?.key).toBe('offers-to-review');
        expect(overview.nextDinner?.inlineAttention?.target).toEqual({
            kind: 'request',
            bookingRequestId: 'req-review',
        });
        expect(overview.attention).toEqual([]);
        expect(overview.createMode).toBe('hidden');
        expect(overview.allClear).toBe(false);
    });

    it('keeps multi-request offers-to-review as standalone attention', () => {
        const overview = profilePageCustomerOverview(
            [
                requestFixture({
                    bookingRequestId: 'req-a',
                    status: 'OFFERS_WAITING_FOR_REVIEW',
                    occasion: 'A',
                    dateTime: '2026-11-10T18:00:00.000Z',
                    offers: [
                        {
                            bookingRequestOfferId: 'offer-a',
                            status: 'OPEN',
                            userUnreadNotificationCount: 0,
                            testimonialMissing: false,
                            callBookings: [],
                        },
                    ],
                }),
                requestFixture({
                    bookingRequestId: 'req-b',
                    status: 'OFFERS_WAITING_FOR_REVIEW',
                    occasion: 'B',
                    dateTime: '2026-11-20T18:00:00.000Z',
                    offers: [
                        {
                            bookingRequestOfferId: 'offer-b',
                            status: 'OPEN',
                            userUnreadNotificationCount: 0,
                            testimonialMissing: false,
                            callBookings: [],
                        },
                    ],
                }),
            ],
            'en',
            DEFAULT_TIME_ZONE,
        );

        expect(overview.nextDinner?.bookingRequestId).toBe('req-a');
        expect(overview.nextDinner?.inlineAttention).toBeNull();
        expect(overview.attention.map((item) => item.key)).toEqual(['offers-to-review']);
        expect(overview.attention[0]?.target).toEqual({ kind: 'requests' });
    });

    it('returns next dinner, secondary create, and allClear when nothing needs attention', () => {
        const overview = profilePageCustomerOverview(
            [
                requestFixture({
                    status: 'EVENT_PENDING',
                    occasion: 'Anniversary',
                    dateTime: '2026-12-15T19:00:00.000Z',
                }),
                requestFixture({
                    bookingRequestId: 'req-2',
                    status: 'WAITING_FOR_OFFERS',
                    occasion: 'Brunch',
                    dateTime: '2026-11-20T11:00:00.000Z',
                }),
            ],
            'de',
            DEFAULT_TIME_ZONE,
        );

        expect(overview.attention).toEqual([]);
        expect(overview.createMode).toBe('secondary');
        expect(overview.allClear).toBe(true);
        expect(overview.nextDinner?.bookingRequestId).toBe('req-2');
        expect(overview.nextDinner?.inlineAttention).toBeNull();
    });

    it('links payment and review attention to the right offer targets', () => {
        const overview = profilePageCustomerOverview(
            [
                requestFixture({
                    status: 'DEPOSIT_PAYMENT_PENDING',
                    offers: [
                        {
                            bookingRequestOfferId: 'offer-pay',
                            status: 'USER_NEEDS_DEPOSIT_PAYMENT',
                            userUnreadNotificationCount: 0,
                            testimonialMissing: false,
                            callBookings: [],
                        },
                    ],
                }),
                requestFixture({
                    bookingRequestId: 'req-done',
                    status: 'COMPLETED',
                    occasion: 'Past dinner',
                    dateTime: '2026-01-01T18:00:00.000Z',
                    offers: [
                        {
                            bookingRequestOfferId: 'offer-review',
                            status: 'COMPLETED',
                            userUnreadNotificationCount: 0,
                            testimonialMissing: true,
                            callBookings: [],
                        },
                    ],
                }),
            ],
            'en',
            DEFAULT_TIME_ZONE,
        );

        // Payment targets next dinner and is inlined; review-missing stays standalone.
        expect(overview.nextDinner?.inlineAttention?.key).toBe('payment-due');
        expect(overview.nextDinner?.inlineAttention?.target).toEqual({
            kind: 'checkout',
            bookingRequestId: 'req-1',
            bookingRequestOfferId: 'offer-pay',
        });
        expect(overview.attention.map((item) => item.key)).toEqual(['review-missing']);
        expect(overview.attention[0]?.target).toEqual({
            kind: 'offer',
            bookingRequestId: 'req-done',
            bookingRequestOfferId: 'offer-review',
            search: { tab: 'testimonial' },
        });
    });
});
