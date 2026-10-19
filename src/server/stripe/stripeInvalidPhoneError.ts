import Stripe from 'stripe';

/** Stripe rejected `individual.phone` as incomplete / not country-valid. */
export function isStripeInvalidPhoneError(error: unknown): boolean {
    if (!(error instanceof Stripe.errors.StripeInvalidRequestError)) {
        return false;
    }
    if (error.param === 'individual[phone]' || error.param === 'phone') {
        return true;
    }
    return /invalid phone number/i.test(error.message);
}
