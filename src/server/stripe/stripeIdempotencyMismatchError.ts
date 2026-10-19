import Stripe from 'stripe';

/** Stripe rejected an idempotency key because the request body differs from the first use. */
export function isStripeIdempotencyMismatchError(error: unknown): boolean {
    if (!(error instanceof Stripe.errors.StripeIdempotencyError)) {
        return false;
    }
    return /same parameters|idempotent requests/i.test(error.message);
}
