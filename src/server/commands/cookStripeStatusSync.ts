import { eq } from 'drizzle-orm';

import { cooks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCookMutation, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { cookStripeAccountStatusApply } from './cookStripeAccountStatusApply';

export async function cookStripeStatusSync(
    { cookId }: GqlSCookMutation,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    try {
        const [cook] = await serverRuntime.db.select().from(cooks).where(eq(cooks.cookId, cookId)).limit(1);
        if (!cook?.stripeAccountId) {
            return { success: true, referenceId: cookId };
        }

        await cookStripeAccountStatusApply({ cookId, stripeAccountId: cook.stripeAccountId }, serverRuntime);

        return { success: true, referenceId: cookId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
