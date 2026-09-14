import { describe, expect, it } from 'vitest';

import { DEFAULT_TIME_ZONE } from '../../shared';
import type { GqlCProfilePageCookStatusFragment } from '../graphql/generated';
import { profilePageCookOverview } from './profilePageCookOverview';

function cookFixture(overrides: Partial<GqlCProfilePageCookStatusFragment> = {}): GqlCProfilePageCookStatusFragment {
    return {
        cookId: 'cook-1',
        isApprovedByAdmin: true,
        stripeStatus: 'COMPLETED',
        biography: 'A long enough bio',
        cuisineStyle: 'italian',
        cookingPhilosophy: 'seasonal',
        exactTravelOriginAddress: {
            displayText: 'Berlin',
            city: 'Berlin',
        },
        mealsCounts: [1],
        menusCounts: [1],
        upcomingCallSlotBookings: [],
        openBookingRequests: [],
        bookingRequestOffers: [{ bookingRequestOfferId: 'offer-1', cookUnreadNotificationCount: 0 }],
        ...overrides,
    };
}

describe('profilePageCookOverview', () => {
    it('returns allClear when setup is complete and nothing needs attention', () => {
        const overview = profilePageCookOverview(cookFixture(), 'en', DEFAULT_TIME_ZONE, { hasProfilePicture: true });
        expect(overview.allClear).toBe(true);
        expect(overview.attention).toEqual([]);
        expect(overview.gettingStarted).toEqual([]);
    });

    it('surfaces unread chat and incomplete onboarding steps', () => {
        const overview = profilePageCookOverview(
            cookFixture({
                stripeStatus: 'EMPTY',
                biography: '',
                cuisineStyle: null,
                cookingPhilosophy: null,
                exactTravelOriginAddress: null,
                mealsCounts: [0],
                menusCounts: [0],
                bookingRequestOffers: [{ bookingRequestOfferId: 'offer-1', cookUnreadNotificationCount: 2 }],
                upcomingCallSlotBookings: [
                    {
                        cookCallSlotBookingId: 'slot-1',
                        startAt: '2026-10-01T10:00:00.000Z',
                        status: 'CONFIRMED',
                        bookingRequestOfferId: 'offer-1',
                        customer: { display: 'Ada' },
                    },
                ],
            }),
            'en',
            DEFAULT_TIME_ZONE,
        );

        expect(overview.attention.map((item) => item.key)).toEqual(['unread-offers', 'upcoming-call']);
        expect(overview.attention.find((item) => item.key === 'unread-offers')).toMatchObject({
            params: { bookingRequestOfferId: 'offer-1', search: { tab: 'chat' } },
            actionLabel: 'Open chat',
        });
        expect(overview.gettingStarted.map((step) => step.key)).toEqual([
            'wallet',
            'travel',
            'profile-picture',
            'chef-profile',
            'first-meal',
            'first-menu',
        ]);
        expect(overview.allClear).toBe(false);
    });

    it('hides wallet and offer steps until approved', () => {
        const overview = profilePageCookOverview(
            cookFixture({
                isApprovedByAdmin: false,
                stripeStatus: 'EMPTY',
                bookingRequestOffers: [],
                mealsCounts: [0],
                menusCounts: [0],
            }),
            'de',
            DEFAULT_TIME_ZONE,
            { hasProfilePicture: true },
        );

        expect(overview.attention.map((item) => item.key)).toEqual(['approval-pending']);
        expect(overview.gettingStarted.map((step) => step.key)).not.toContain('wallet');
        expect(overview.gettingStarted.map((step) => step.key)).not.toContain('first-offer');
    });

    it('asks for a profile picture until one is set', () => {
        const missing = profilePageCookOverview(cookFixture(), 'en', DEFAULT_TIME_ZONE, { hasProfilePicture: false });
        expect(missing.gettingStarted.map((step) => step.key)).toEqual(['profile-picture']);
        expect(missing.gettingStarted[0]?.href).toBe('/{-$locale}/profile/chef-profile/edit');

        const present = profilePageCookOverview(cookFixture(), 'en', DEFAULT_TIME_ZONE, { hasProfilePicture: true });
        expect(present.gettingStarted.map((step) => step.key)).not.toContain('profile-picture');
    });

    it('surfaces ACTIVE_WAS_RESET as Attention and not Getting started wallet', () => {
        const overview = profilePageCookOverview(cookFixture({ stripeStatus: 'ACTIVE_WAS_RESET' }), 'en', DEFAULT_TIME_ZONE, {
            hasProfilePicture: true,
        });

        expect(overview.attention.map((item) => item.key)).toEqual(['wallet-reset']);
        expect(overview.attention[0]).toMatchObject({
            tone: 'warning',
            href: '/{-$locale}/profile/wallet',
            actionLabel: 'Go to wallet',
        });
        expect(overview.gettingStarted.map((step) => step.key)).not.toContain('wallet');
        expect(overview.allClear).toBe(false);
    });
});
