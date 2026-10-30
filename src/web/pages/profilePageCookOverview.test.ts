import { describe, expect, it } from 'vitest';

import { DEFAULT_TIME_ZONE } from '../../shared';
import type { GqlCProfilePageCookStatusFragment } from '../graphql/generated';
import { profilePageCookOverview } from './profilePageCookOverview';

function cookFixture(overrides: Partial<GqlCProfilePageCookStatusFragment> = {}): GqlCProfilePageCookStatusFragment {
    return {
        cookId: 'cook-1',
        attention: [],
        onboardingSteps: [],
        attentionCounts: { bookingRequestPoolCount: 0, bookingRequestOfferUnreadCount: 0, walletNeedsAttention: false },
        analytics: null,
        ...overrides,
    };
}

function attentionItem(
    overrides: Partial<GqlCProfilePageCookStatusFragment['attention'][number]>,
): GqlCProfilePageCookStatusFragment['attention'][number] {
    return { kind: 'APPROVAL_PENDING', count: 1, bookingRequestOfferId: null, callStartAt: null, customerDisplay: null, ...overrides };
}

describe('profilePageCookOverview', () => {
    it('returns allClear when the server reports nothing to do', () => {
        // Act
        const overview = profilePageCookOverview(cookFixture(), 'en', DEFAULT_TIME_ZONE);

        // Assert
        expect(overview).toEqual({ attention: [], gettingStarted: [], allClear: true });
    });

    it('links unread chat to the chat tab and the next call to the offer', () => {
        // Arrange
        const cook = cookFixture({
            attention: [
                attentionItem({ kind: 'OFFER_CHAT_UNREAD', count: 2, bookingRequestOfferId: 'offer-1' }),
                attentionItem({
                    kind: 'CALL_UPCOMING',
                    bookingRequestOfferId: 'offer-2',
                    callStartAt: '2026-10-01T10:00:00.000Z',
                    customerDisplay: 'Ada',
                }),
            ],
        });

        // Act
        const overview = profilePageCookOverview(cook, 'en', DEFAULT_TIME_ZONE);

        // Assert
        expect(overview.attention.map((item) => item.kind)).toEqual(['OFFER_CHAT_UNREAD', 'CALL_UPCOMING']);
        expect(overview.attention[0]).toMatchObject({
            tone: 'warning',
            title: '2 new messages in offer chats',
            action: {
                to: '/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId',
                bookingRequestOfferId: 'offer-1',
                search: { tab: 'chat' },
                label: 'Open chat',
            },
        });
        expect(overview.attention[1]?.action).toMatchObject({ bookingRequestOfferId: 'offer-2', search: undefined });
        expect(overview.attention[1]?.body).toMatch(/^Ada · /);
    });

    it('shows pending approval without an action and wallet reset with one', () => {
        // Arrange
        const cook = cookFixture({ attention: [attentionItem({ kind: 'APPROVAL_PENDING' }), attentionItem({ kind: 'WALLET_RESET' })] });

        // Act
        const overview = profilePageCookOverview(cook, 'en', DEFAULT_TIME_ZONE);

        // Assert
        expect(overview.attention[0]).toMatchObject({ tone: 'info', action: null });
        expect(overview.attention[1]).toMatchObject({
            tone: 'warning',
            action: { to: '/{-$locale}/profile/wallet', label: 'Go to wallet' },
        });
    });

    it('maps onboarding steps to their pages in server order', () => {
        // Arrange
        const cook = cookFixture({ onboardingSteps: ['WALLET', 'PROFILE_PICTURE', 'FIRST_OFFER'] });

        // Act
        const overview = profilePageCookOverview(cook, 'de', DEFAULT_TIME_ZONE);

        // Assert
        expect(overview.gettingStarted.map((step) => step.href)).toEqual([
            '/{-$locale}/profile/wallet',
            '/{-$locale}/profile/chef-profile/edit',
            '/{-$locale}/profile/booking-request-pool',
        ]);
        expect(overview.gettingStarted[1]?.actionLabel).toBe('Bild hinzufügen');
        expect(overview.allClear).toBe(false);
    });
});
