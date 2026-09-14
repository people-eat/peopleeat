import type { Cook } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCookPayoutBlockedReason } from '../graphql/generated';

export type BookingRequestOfferCookPayoutReadiness = {
    cookPayoutReady: boolean;
    cookPayoutBlockedReason: GqlSAdminCookPayoutBlockedReason | null;
};

/**
 * Resolves whether an admin can release a Stripe bank payout for this cook.
 * DB fields gate first; when the account looks active, Stripe is checked live
 * for `payouts_enabled` so the UI can show readiness before the release CTA.
 * Stripe retrieve failures (missing / inaccessible Connect account) degrade to
 * not-ready instead of throwing — admin list/detail loaders must stay up.
 */
export async function bookingRequestOfferCookPayoutReadinessResolve(
    cook: Pick<Cook, 'stripeAccountId' | 'stripeAccountActive'>,
    stripe: Pick<ServerRuntime['stripe'], 'accountPayoutsEnabledCheck'>,
): Promise<BookingRequestOfferCookPayoutReadiness> {
    if (!cook.stripeAccountId) {
        return { cookPayoutReady: false, cookPayoutBlockedReason: 'MISSING_STRIPE_ACCOUNT' };
    }
    if (!cook.stripeAccountActive) {
        return { cookPayoutReady: false, cookPayoutBlockedReason: 'STRIPE_ACCOUNT_INACTIVE' };
    }

    try {
        const payoutsEnabled = await stripe.accountPayoutsEnabledCheck(cook.stripeAccountId);
        if (!payoutsEnabled) {
            return { cookPayoutReady: false, cookPayoutBlockedReason: 'STRIPE_PAYOUTS_DISABLED' };
        }
        return { cookPayoutReady: true, cookPayoutBlockedReason: null };
    } catch {
        return { cookPayoutReady: false, cookPayoutBlockedReason: 'STRIPE_ACCOUNT_INACTIVE' };
    }
}
