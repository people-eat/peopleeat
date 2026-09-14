import type Stripe from 'stripe';

// Express connected accounts are ready for destination charges when Stripe
// has collected details and enabled charges + payouts. Callers that only
// need "finished the hosted onboarding form" can use `details_submitted`
// alone — we require the full triad so booking commands do not offer a
// cook who cannot yet receive funds.
export function stripeAccountOnboardingComplete(account: Stripe.Account): boolean {
    return account.details_submitted === true && account.charges_enabled === true && account.payouts_enabled === true;
}
