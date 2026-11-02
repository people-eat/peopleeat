import { describe, expect, it } from 'vitest';

import { stripePaymentMethodOwnedCustomerId } from './stripePaymentMethodOwnedCustomerId';

describe('stripePaymentMethodOwnedCustomerId', () => {
    it('returns a string customer id', () => {
        expect(stripePaymentMethodOwnedCustomerId('cus_owned')).toBe('cus_owned');
    });

    it('returns an expanded customer object id', () => {
        expect(stripePaymentMethodOwnedCustomerId({ id: 'cus_expanded' })).toBe('cus_expanded');
    });

    it('returns undefined when unattached', () => {
        expect(stripePaymentMethodOwnedCustomerId(null)).toBeUndefined();
        expect(stripePaymentMethodOwnedCustomerId(undefined)).toBeUndefined();
    });
});
