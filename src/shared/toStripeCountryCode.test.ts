import { describe, expect, it } from 'vitest';

import { toStripeCountryCode } from './toStripeCountryCode';

describe('toStripeCountryCode', () => {
    it('passes through ISO alpha-2 codes', () => {
        expect(toStripeCountryCode('DE')).toBe('DE');
        expect(toStripeCountryCode('at')).toBe('AT');
    });

    it('maps common long-form country names', () => {
        expect(toStripeCountryCode('Deutschland')).toBe('DE');
        expect(toStripeCountryCode('Germany')).toBe('DE');
        expect(toStripeCountryCode('Österreich')).toBe('AT');
    });

    it('returns empty string for unknown values', () => {
        expect(toStripeCountryCode('Narnia')).toBe('');
        expect(toStripeCountryCode('')).toBe('');
    });
});
