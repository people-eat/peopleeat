import { describe, expect, it } from 'vitest';

import { cookCanCreateOffersDerive, cookStripeStatusDerive, cookWalletNeedsAttentionDerive } from './cook';

describe('cookStripeStatusDerive', () => {
    it('returns EMPTY when no account id', () => {
        expect(
            cookStripeStatusDerive({
                stripeAccountId: null,
                stripeAccountActive: false,
                stripeAccountActiveWasReset: false,
            }),
        ).toBe('EMPTY');
    });

    it('returns ACTIVE_WAS_RESET when the reset flag is set', () => {
        expect(
            cookStripeStatusDerive({
                stripeAccountId: 'acct_1',
                stripeAccountActive: true,
                stripeAccountActiveWasReset: true,
            }),
        ).toBe('ACTIVE_WAS_RESET');
    });

    it('returns COMPLETED when active', () => {
        expect(
            cookStripeStatusDerive({
                stripeAccountId: 'acct_1',
                stripeAccountActive: true,
                stripeAccountActiveWasReset: false,
            }),
        ).toBe('COMPLETED');
    });

    it('returns PREPARED when account exists but inactive', () => {
        expect(
            cookStripeStatusDerive({
                stripeAccountId: 'acct_1',
                stripeAccountActive: false,
                stripeAccountActiveWasReset: false,
            }),
        ).toBe('PREPARED');
    });
});

describe('cookWalletNeedsAttentionDerive', () => {
    it('flags approved cooks until Stripe is completed, never unapproved cooks', () => {
        // Arrange
        const prepared = { stripeAccountId: 'acct_1', stripeAccountActive: false, stripeAccountActiveWasReset: false };
        const completed = { stripeAccountId: 'acct_1', stripeAccountActive: true, stripeAccountActiveWasReset: false };
        const wasReset = { stripeAccountId: 'acct_1', stripeAccountActive: true, stripeAccountActiveWasReset: true };
        const empty = { stripeAccountId: null, stripeAccountActive: false, stripeAccountActiveWasReset: false };

        // Act / Assert
        expect(cookWalletNeedsAttentionDerive({ isApprovedByAdmin: true, ...empty })).toBe(true);
        expect(cookWalletNeedsAttentionDerive({ isApprovedByAdmin: true, ...prepared })).toBe(true);
        expect(cookWalletNeedsAttentionDerive({ isApprovedByAdmin: true, ...wasReset })).toBe(true);
        expect(cookWalletNeedsAttentionDerive({ isApprovedByAdmin: true, ...completed })).toBe(false);
        expect(cookWalletNeedsAttentionDerive({ isApprovedByAdmin: false, ...empty })).toBe(false);
    });
});

describe('cookCanCreateOffersDerive', () => {
    it('requires ACTIVE status, approval, and completed Stripe', () => {
        expect(
            cookCanCreateOffersDerive(
                {
                    isApprovedByAdmin: true,
                    stripeAccountId: 'acct_1',
                    stripeAccountActive: true,
                    stripeAccountActiveWasReset: false,
                },
                'ACTIVE',
            ),
        ).toBe(true);
        expect(
            cookCanCreateOffersDerive(
                {
                    isApprovedByAdmin: false,
                    stripeAccountId: 'acct_1',
                    stripeAccountActive: true,
                    stripeAccountActiveWasReset: false,
                },
                'ACTIVE',
            ),
        ).toBe(false);
        expect(
            cookCanCreateOffersDerive(
                {
                    isApprovedByAdmin: true,
                    stripeAccountId: 'acct_1',
                    stripeAccountActive: true,
                    stripeAccountActiveWasReset: false,
                },
                'BANNED',
            ),
        ).toBe(false);
    });
});
