import { eq } from 'drizzle-orm';

import { cooks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCookStripeAccountDetails, GqlSSession } from '../graphql/generated';

/** Live `accounts.retrieve` requirements snapshot. Null without account id or on Stripe failure. */
export async function cookStripeAccountDetailsLoad(
    cookId: string,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookStripeAccountDetails | null> {
    try {
        const [cook] = await serverRuntime.db.select().from(cooks).where(eq(cooks.cookId, cookId)).limit(1);
        if (!cook?.stripeAccountId) {
            return null;
        }

        const details = await serverRuntime.stripe.accountRequirementsFindOne(cook.stripeAccountId);
        return {
            detailsSubmitted: details.detailsSubmitted,
            chargesEnabled: details.chargesEnabled,
            payoutsEnabled: details.payoutsEnabled,
            disabledReason: details.disabledReason,
            currentlyDue: details.currentlyDue,
            pastDue: details.pastDue,
            pendingVerification: details.pendingVerification,
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        return null;
    }
}
