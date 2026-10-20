import { describe, expect, it } from 'vitest';

import { stripePayoutStatusFromStripe } from './stripePayoutStatus';

describe('stripePayoutStatusFromStripe', () => {
    it('maps known Stripe payout statuses', () => {
        expect(stripePayoutStatusFromStripe('paid')).toBe('PAID');
        expect(stripePayoutStatusFromStripe('pending')).toBe('PENDING');
        expect(stripePayoutStatusFromStripe('in_transit')).toBe('IN_TRANSIT');
        expect(stripePayoutStatusFromStripe('canceled')).toBe('CANCELED');
        expect(stripePayoutStatusFromStripe('failed')).toBe('FAILED');
    });

    it('maps unknown statuses to OTHER', () => {
        expect(stripePayoutStatusFromStripe('weird')).toBe('OTHER');
    });
});
