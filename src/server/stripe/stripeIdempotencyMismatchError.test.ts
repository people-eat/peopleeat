import Stripe from 'stripe';
import { describe, expect, it } from 'vitest';

import { isStripeIdempotencyMismatchError } from './stripeIdempotencyMismatchError';

describe('isStripeIdempotencyMismatchError', () => {
    it('matches Stripe idempotency parameter-mismatch errors', () => {
        const error = new Stripe.errors.StripeIdempotencyError({
            message:
                "Keys for idempotent requests can only be used with the same parameters they were first used with. Try using a key other than 'cook-express-account:abc' if you meant to execute a different request.",
            type: 'idempotency_error',
        });
        expect(isStripeIdempotencyMismatchError(error)).toBe(true);
    });

    it('rejects unrelated Stripe errors', () => {
        const error = new Stripe.errors.StripeInvalidRequestError({
            message: 'Invalid email address',
            type: 'invalid_request_error',
            param: 'email',
        });
        expect(isStripeIdempotencyMismatchError(error)).toBe(false);
        expect(isStripeIdempotencyMismatchError(new Error('network'))).toBe(false);
    });
});
