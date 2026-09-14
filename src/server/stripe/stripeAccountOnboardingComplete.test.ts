import { describe, expect, it } from 'vitest';

import { stripeAccountOnboardingComplete } from './stripeAccountOnboardingComplete';
import { stripeSearchQuote } from './stripeSearchQuote';

describe('stripeSearchQuote', () => {
    it('escapes single quotes and backslashes for Stripe Search', () => {
        expect(stripeSearchQuote("user's")).toBe("user\\'s");
        expect(stripeSearchQuote('a\\b')).toBe('a\\\\b');
    });
});

describe('stripeAccountOnboardingComplete', () => {
    it('requires details, charges, and payouts', () => {
        expect(
            stripeAccountOnboardingComplete({
                details_submitted: true,
                charges_enabled: true,
                payouts_enabled: true,
            } as never),
        ).toBe(true);

        expect(
            stripeAccountOnboardingComplete({
                details_submitted: true,
                charges_enabled: true,
                payouts_enabled: false,
            } as never),
        ).toBe(false);
    });
});
