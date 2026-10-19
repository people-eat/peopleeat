import Stripe from 'stripe';
import { describe, expect, it } from 'vitest';

import { isStripeInvalidPhoneError } from './stripeInvalidPhoneError';

describe('isStripeInvalidPhoneError', () => {
    it('matches Stripe invalid-request errors on individual[phone]', () => {
        const error = new Stripe.errors.StripeInvalidRequestError({
            message: '"+49123456789" is an invalid phone number. Enter a complete phone number.',
            type: 'invalid_request_error',
            param: 'individual[phone]',
        });
        expect(isStripeInvalidPhoneError(error)).toBe(true);
    });

    it('matches by message when param is missing', () => {
        const error = new Stripe.errors.StripeInvalidRequestError({
            message: '"+49123456789" is an invalid phone number. Enter a complete phone number.',
            type: 'invalid_request_error',
        });
        expect(isStripeInvalidPhoneError(error)).toBe(true);
    });

    it('rejects unrelated Stripe errors', () => {
        const error = new Stripe.errors.StripeInvalidRequestError({
            message: 'Invalid email address',
            type: 'invalid_request_error',
            param: 'email',
        });
        expect(isStripeInvalidPhoneError(error)).toBe(false);
        expect(isStripeInvalidPhoneError(new Error('network'))).toBe(false);
    });
});
