import { and, eq } from 'drizzle-orm';

import { cookCallAvailabilityRules } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCookMutation,
    GqlSCookMutationCallAvailabilityRuleDeleteArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function cookCallAvailabilityRuleDelete(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationCallAvailabilityRuleDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    try {
        const deleted = await serverRuntime.db
            .delete(cookCallAvailabilityRules)
            .where(
                and(
                    eq(cookCallAvailabilityRules.cookCallAvailabilityRuleId, args.cookCallAvailabilityRuleId),
                    eq(cookCallAvailabilityRules.cookId, cookId),
                ),
            )
            .returning({ cookCallAvailabilityRuleId: cookCallAvailabilityRules.cookCallAvailabilityRuleId });

        if (deleted.length === 0) {
            throw new Error('cookCallAvailabilityRuleDelete: rule not found');
        }

        await serverRuntime.publish.userUpdates({ userId: cookId });
        return { success: true, referenceId: args.cookCallAvailabilityRuleId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
