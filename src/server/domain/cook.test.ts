import { describe, expect, it } from 'vitest';

import { cookCanCreateOffersDerive, cookStripeStatusDerive } from './cook';

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
