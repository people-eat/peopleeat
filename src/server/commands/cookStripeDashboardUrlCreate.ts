import { eq } from 'drizzle-orm';

import { cooks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCookMutation, GqlSCookStripeDashboardResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function cookStripeDashboardUrlCreate(
    { cookId }: GqlSCookMutation,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookStripeDashboardResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    try {
        const [cook] = await serverRuntime.db.select().from(cooks).where(eq(cooks.cookId, cookId)).limit(1);
        if (!cook?.stripeAccountId || !cook.stripeAccountActive) {
            return { url: null };
        }

        const dashboardUrl = await serverRuntime.stripe.accountDashboardUrlCreate(cook.stripeAccountId);
        return { url: dashboardUrl.href };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
