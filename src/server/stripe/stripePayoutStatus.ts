import type { StripePayoutStatus } from './StripePayment';

export function stripePayoutStatusFromStripe(status: string): StripePayoutStatus {
    if (status === 'paid') return 'PAID';
    if (status === 'pending') return 'PENDING';
    if (status === 'in_transit') return 'IN_TRANSIT';
    if (status === 'canceled') return 'CANCELED';
    if (status === 'failed') return 'FAILED';
    return 'OTHER';
}
