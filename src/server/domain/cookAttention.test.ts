import { describe, expect, it } from 'vitest';

import { cookAttentionDerive, cookOnboardingStepsDerive } from './cookAttention';

type AttentionInput = Parameters<typeof cookAttentionDerive>[0];
type OnboardingInput = Parameters<typeof cookOnboardingStepsDerive>[0];

function attentionInput(overrides: Partial<AttentionInput> = {}): AttentionInput {
    return {
        isApprovedByAdmin: true,
        stripeStatus: 'COMPLETED',
        offers: [{ bookingRequestOfferId: 'offer-1', cookUnreadNotificationCount: 0 }],
        nextCall: null,
        ...overrides,
    };
}

function onboardingInput(overrides: Partial<OnboardingInput> = {}): OnboardingInput {
    return {
        isApprovedByAdmin: true,
        stripeStatus: 'COMPLETED',
        hasTravelOrigin: true,
        hasProfilePicture: true,
        biography: 'A long enough bio',
        cuisineStyle: 'italian',
        cookingPhilosophy: 'seasonal',
        mealCount: 1,
        menuCount: 1,
        offerCount: 1,
        ...overrides,
    };
}

describe('cookAttentionDerive', () => {
    it('returns nothing for an approved cook with nothing open', () => {
        // Act
        const items = cookAttentionDerive(attentionInput());

        // Assert
        expect(items).toEqual([]);
    });

    it('surfaces unread chat before the next call', () => {
        // Arrange
        const startAt = new Date('2026-10-01T10:00:00.000Z');
        const input = attentionInput({
            offers: [
                { bookingRequestOfferId: 'offer-1', cookUnreadNotificationCount: 2 },
                { bookingRequestOfferId: 'offer-2', cookUnreadNotificationCount: 2 },
            ],
            nextCall: { bookingRequestOfferId: 'offer-2', startAt, customerDisplay: 'Ada' },
        });

        // Act
        const items = cookAttentionDerive(input);

        // Assert
        expect(items).toEqual([
            { kind: 'OFFER_CHAT_UNREAD', count: 4, bookingRequestOfferId: 'offer-1', callStartAt: null, customerDisplay: null },
            { kind: 'CALL_UPCOMING', count: 1, bookingRequestOfferId: 'offer-2', callStartAt: startAt, customerDisplay: 'Ada' },
        ]);
    });

    it('flags pending approval for unapproved cooks', () => {
        // Act
        const items = cookAttentionDerive(attentionInput({ isApprovedByAdmin: false, stripeStatus: 'EMPTY' }));

        // Assert
        expect(items.map((item) => item.kind)).toEqual(['APPROVAL_PENDING']);
    });

    it('flags a reset Stripe account only once approved', () => {
        // Act
        const approved = cookAttentionDerive(attentionInput({ stripeStatus: 'ACTIVE_WAS_RESET' }));
        const unapproved = cookAttentionDerive(attentionInput({ isApprovedByAdmin: false, stripeStatus: 'ACTIVE_WAS_RESET' }));

        // Assert
        expect(approved.map((item) => item.kind)).toEqual(['WALLET_RESET']);
        expect(unapproved.map((item) => item.kind)).toEqual(['APPROVAL_PENDING']);
    });
});

describe('cookOnboardingStepsDerive', () => {
    it('returns no steps once the cook is set up', () => {
        // Act
        const steps = cookOnboardingStepsDerive(onboardingInput());

        // Assert
        expect(steps).toEqual([]);
    });

    it('lists missing steps in display order', () => {
        // Arrange
        const input = onboardingInput({
            stripeStatus: 'EMPTY',
            hasTravelOrigin: false,
            hasProfilePicture: false,
            biography: '  ',
            cuisineStyle: null,
            mealCount: 0,
            menuCount: 0,
        });

        // Act
        const steps = cookOnboardingStepsDerive(input);

        // Assert
        expect(steps).toEqual(['WALLET', 'TRAVEL', 'PROFILE_PICTURE', 'CHEF_PROFILE', 'FIRST_MEAL', 'FIRST_MENU']);
    });

    it('holds wallet and first offer until approval', () => {
        // Act
        const steps = cookOnboardingStepsDerive(onboardingInput({ isApprovedByAdmin: false, stripeStatus: 'EMPTY', offerCount: 0 }));

        // Assert
        expect(steps).not.toContain('WALLET');
        expect(steps).not.toContain('FIRST_OFFER');
    });

    it('asks for the first offer once the wallet is ready', () => {
        // Act
        const ready = cookOnboardingStepsDerive(onboardingInput({ offerCount: 0 }));
        const walletReset = cookOnboardingStepsDerive(onboardingInput({ stripeStatus: 'ACTIVE_WAS_RESET', offerCount: 0 }));

        // Assert
        expect(ready).toEqual(['FIRST_OFFER']);
        expect(walletReset).toEqual([]);
    });
});
