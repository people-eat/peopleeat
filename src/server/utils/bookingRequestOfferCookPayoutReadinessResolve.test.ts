import { describe, expect, it, vi } from 'vitest';

import { bookingRequestOfferCookPayoutReadinessResolve } from './bookingRequestOfferCookPayoutReadinessResolve';

describe('bookingRequestOfferCookPayoutReadinessResolve', () => {
    it('returns MISSING_STRIPE_ACCOUNT when no account id', async () => {
        const stripe = { accountPayoutsEnabledCheck: vi.fn() };
        await expect(
            bookingRequestOfferCookPayoutReadinessResolve({ stripeAccountId: null, stripeAccountActive: false }, stripe),
        ).resolves.toEqual({ cookPayoutReady: false, cookPayoutBlockedReason: 'MISSING_STRIPE_ACCOUNT' });
        expect(stripe.accountPayoutsEnabledCheck).not.toHaveBeenCalled();
    });

    it('returns STRIPE_ACCOUNT_INACTIVE when DB marks account inactive', async () => {
        const stripe = { accountPayoutsEnabledCheck: vi.fn() };
        await expect(
            bookingRequestOfferCookPayoutReadinessResolve({ stripeAccountId: 'acct_test', stripeAccountActive: false }, stripe),
        ).resolves.toEqual({ cookPayoutReady: false, cookPayoutBlockedReason: 'STRIPE_ACCOUNT_INACTIVE' });
        expect(stripe.accountPayoutsEnabledCheck).not.toHaveBeenCalled();
    });

    it('returns STRIPE_PAYOUTS_DISABLED when Stripe reports payouts off', async () => {
        const stripe = { accountPayoutsEnabledCheck: vi.fn(async () => false) };
        await expect(
            bookingRequestOfferCookPayoutReadinessResolve({ stripeAccountId: 'acct_test', stripeAccountActive: true }, stripe),
        ).resolves.toEqual({ cookPayoutReady: false, cookPayoutBlockedReason: 'STRIPE_PAYOUTS_DISABLED' });
    });

    it('returns ready when Stripe reports payouts enabled', async () => {
        const stripe = { accountPayoutsEnabledCheck: vi.fn(async () => true) };
        await expect(
            bookingRequestOfferCookPayoutReadinessResolve({ stripeAccountId: 'acct_live', stripeAccountActive: true }, stripe),
        ).resolves.toEqual({ cookPayoutReady: true, cookPayoutBlockedReason: null });
    });

    it('degrades to STRIPE_ACCOUNT_INACTIVE when Stripe retrieve fails', async () => {
        const stripe = {
            accountPayoutsEnabledCheck: vi.fn(async () => {
                throw new Error(
                    "The provided key 'sk_test_…' does not have access to account 'acct_test' (or that account does not exist).",
                );
            }),
        };
        await expect(
            bookingRequestOfferCookPayoutReadinessResolve({ stripeAccountId: 'acct_test', stripeAccountActive: true }, stripe),
        ).resolves.toEqual({ cookPayoutReady: false, cookPayoutBlockedReason: 'STRIPE_ACCOUNT_INACTIVE' });
    });
});
