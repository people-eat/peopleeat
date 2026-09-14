import { eq } from 'drizzle-orm';

import { cooks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCook, GqlSCookStripeAccountDetails, GqlSSession } from '../graphql/generated';

export async function cookStripeAccountDetailsFindOne(
    { cookId }: GqlSCook,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookStripeAccountDetails | null> {
    if (!requestingSession.userId || requestingSession.userId !== cookId) {
        return null;
    }

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
        // Wallet page should still render coarse stripeStatus when Stripe is down.
        serverRuntime.log.error(error, requestingSession);
        return null;
    }
}
