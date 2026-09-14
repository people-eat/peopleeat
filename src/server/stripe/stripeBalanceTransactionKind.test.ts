import { describe, expect, it } from 'vitest';

import { stripeBalanceTransactionKindFromStripe, stripeBalanceTransactionStatusFromStripe } from './stripeBalanceTransactionKind';

describe('stripeBalanceTransactionKindFromStripe', () => {
    it('maps payment-family types', () => {
        expect(stripeBalanceTransactionKindFromStripe('payment')).toBe('PAYMENT');
        expect(stripeBalanceTransactionKindFromStripe('payment_refund')).toBe('PAYMENT');
    });

    it('maps payout-family types', () => {
        expect(stripeBalanceTransactionKindFromStripe('payout')).toBe('PAYOUT');
        expect(stripeBalanceTransactionKindFromStripe('payout_failure')).toBe('PAYOUT');
    });

    it('maps transfer / fee / adjustment / other', () => {
        expect(stripeBalanceTransactionKindFromStripe('transfer')).toBe('TRANSFER');
        expect(stripeBalanceTransactionKindFromStripe('stripe_fee')).toBe('FEE');
        expect(stripeBalanceTransactionKindFromStripe('adjustment')).toBe('ADJUSTMENT');
        expect(stripeBalanceTransactionKindFromStripe('climate_order_purchase')).toBe('OTHER');
    });
});

describe('stripeBalanceTransactionStatusFromStripe', () => {
    it('maps available and pending', () => {
        expect(stripeBalanceTransactionStatusFromStripe('available')).toBe('AVAILABLE');
        expect(stripeBalanceTransactionStatusFromStripe('pending')).toBe('PENDING');
    });
});
