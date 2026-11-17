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
    const invoiceAddress = {
        companyName: null,
        firstName: 'Ada',
        lastName: 'Smith',
        country: 'DE',
        city: 'Berlin',
        postalCode: '10117',
        line1: 'Unter den Linden 1',
        line2: '',
    };

    it('flags every cook until an invoice address is saved', () => {
        const empty = { stripeAccountId: null, stripeAccountActive: false, stripeAccountActiveWasReset: false, invoiceAddress: null };
        expect(cookWalletNeedsAttentionDerive({ isApprovedByAdmin: false, ...empty })).toBe(true);
        expect(cookWalletNeedsAttentionDerive({ isApprovedByAdmin: true, ...empty })).toBe(true);
    });

    it('flags approved cooks until Stripe is completed once an invoice address exists', () => {
        // Arrange
        const prepared = {
            stripeAccountId: 'acct_1',
            stripeAccountActive: false,
            stripeAccountActiveWasReset: false,
            invoiceAddress,
        };
        const completed = {
            stripeAccountId: 'acct_1',
            stripeAccountActive: true,
            stripeAccountActiveWasReset: false,
            invoiceAddress,
        };
        const wasReset = {
            stripeAccountId: 'acct_1',
            stripeAccountActive: true,
            stripeAccountActiveWasReset: true,
            invoiceAddress,
        };
        const empty = { stripeAccountId: null, stripeAccountActive: false, stripeAccountActiveWasReset: false, invoiceAddress };

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
