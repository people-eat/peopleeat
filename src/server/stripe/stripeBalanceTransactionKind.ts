import type { StripeBalanceTransactionKind, StripeBalanceTransactionStatus } from './StripePayment';

export function stripeBalanceTransactionKindFromStripe(type: string): StripeBalanceTransactionKind {
    if (type === 'payment' || type === 'payment_refund' || type === 'payment_failure_refund' || type === 'payment_reversal') {
        return 'PAYMENT';
    }
    if (
        type === 'payout' ||
        type === 'payout_cancel' ||
        type === 'payout_failure' ||
        type === 'payout_minimum_balance_hold' ||
        type === 'payout_minimum_balance_release'
    ) {
        return 'PAYOUT';
    }
    if (type === 'transfer' || type === 'transfer_refund' || type === 'transfer_cancel' || type === 'transfer_failure') {
        return 'TRANSFER';
    }
    if (type === 'stripe_fee' || type === 'application_fee' || type === 'application_fee_refund') {
        return 'FEE';
    }
    if (type === 'adjustment') {
        return 'ADJUSTMENT';
    }
    return 'OTHER';
}

export function stripeBalanceTransactionStatusFromStripe(status: string): StripeBalanceTransactionStatus {
    return status === 'available' ? 'AVAILABLE' : 'PENDING';
}
