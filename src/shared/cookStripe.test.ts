import { describe, expect, it } from 'vitest';

import type { CookStripeAccountDetails } from './cookStripe';
import {
    cookStripeAccountDetailsCategories,
    cookStripeAccountDetailsHasActionableContent,
    cookStripeAccountDetailsTitle,
    cookStripeAccountDetailsTone,
    cookStripeDisabledReasonLabel,
    cookStripeStatusDescription,
} from './cookStripe';

function accountDetails(overrides: Partial<CookStripeAccountDetails> = {}): CookStripeAccountDetails {
    return {
        detailsSubmitted: true,
        chargesEnabled: true,
        payoutsEnabled: true,
        disabledReason: null,
        currentlyDue: [],
        pastDue: [],
        pendingVerification: [],
        ...overrides,
    };
}

describe('cookStripeAccountDetailsTone', () => {
    it('is an error when requirements are past due', () => {
        // Arrange
        const details = accountDetails({ pastDue: ['BANK_ACCOUNT'] });

        // Act
        const tone = cookStripeAccountDetailsTone(details);

        // Assert
        expect(tone).toBe('error');
    });

    it('is an error when Stripe rejected or restricted the account', () => {
        // Arrange
        const rejected = accountDetails({ disabledReason: 'REJECTED' });
        const listed = accountDetails({ disabledReason: 'LISTED' });

        // Act
        const tones = [cookStripeAccountDetailsTone(rejected), cookStripeAccountDetailsTone(listed)];

        // Assert
        expect(tones).toEqual(['error', 'error']);
    });

    it('is info while Stripe only reviews documents', () => {
        // Arrange
        const details = accountDetails({ pendingVerification: ['IDENTITY_VERIFICATION'] });

        // Act
        const tone = cookStripeAccountDetailsTone(details);

        // Assert
        expect(tone).toBe('info');
    });

    it('is a warning when the cook still owes details', () => {
        // Arrange
        const details = accountDetails({ currentlyDue: ['PERSONAL_DETAILS'], pendingVerification: ['IDENTITY_VERIFICATION'] });

        // Act
        const tone = cookStripeAccountDetailsTone(details);

        // Assert
        expect(tone).toBe('warning');
    });
});

describe('cookStripeAccountDetailsTitle', () => {
    it('prioritizes overdue details over a running review', () => {
        // Arrange
        const details = accountDetails({ pastDue: ['BANK_ACCOUNT'], pendingVerification: ['IDENTITY_VERIFICATION'] });

        // Act
        const title = cookStripeAccountDetailsTitle(details, 'en');

        // Assert
        expect(title).toBe('Details overdue');
    });
});

describe('cookStripeAccountDetailsCategories', () => {
    it('lists past-due categories first and drops repeats', () => {
        // Arrange
        const details = accountDetails({
            pastDue: ['BANK_ACCOUNT'],
            currentlyDue: ['PERSONAL_DETAILS', 'BANK_ACCOUNT'],
            pendingVerification: ['IDENTITY_VERIFICATION', 'PERSONAL_DETAILS'],
        });

        // Act
        const categories = cookStripeAccountDetailsCategories(details);

        // Assert
        expect(categories).toEqual(['BANK_ACCOUNT', 'PERSONAL_DETAILS', 'IDENTITY_VERIFICATION']);
    });
});

describe('cookStripeAccountDetailsHasActionableContent', () => {
    it('is false for a fully enabled account without open requirements', () => {
        // Arrange
        const details = accountDetails();

        // Act
        const actionable = cookStripeAccountDetailsHasActionableContent(details, 'COMPLETED');

        // Assert
        expect(actionable).toBe(false);
    });

    it('is true when submitted details have not unlocked payouts before completion', () => {
        // Arrange
        const details = accountDetails({ payoutsEnabled: false });

        // Act
        const actionable = cookStripeAccountDetailsHasActionableContent(details, 'PREPARED');

        // Assert
        expect(actionable).toBe(true);
    });

    it('is true whenever Stripe reports a disabled reason', () => {
        // Arrange
        const details = accountDetails({ disabledReason: 'OTHER' });

        // Act
        const actionable = cookStripeAccountDetailsHasActionableContent(details, 'COMPLETED');

        // Assert
        expect(actionable).toBe(true);
    });
});

describe('cookStripe audience wording', () => {
    it('addresses the cook directly and keeps admin copy neutral', () => {
        // Arrange — nothing

        // Act
        const cookDescription = cookStripeStatusDescription('EMPTY', 'en', 'cook');
        const adminDescription = cookStripeStatusDescription('EMPTY', 'en', 'admin');
        const cookReason = cookStripeDisabledReasonLabel('LISTED', 'en', 'cook');
        const adminReason = cookStripeDisabledReasonLabel('LISTED', 'en', 'admin');

        // Assert
        expect(cookDescription).toContain('your Stripe account');
        expect(adminDescription).not.toContain('your');
        expect(cookReason).toContain('Your Stripe account');
        expect(adminReason).toContain('The Stripe account');
    });
});
