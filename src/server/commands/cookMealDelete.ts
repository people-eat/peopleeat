import { and, eq, isNull } from 'drizzle-orm';

import { meals } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCookMutation, GqlSCookMutationMealDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { cookMealRelationshipsFind } from '../utils/cookMealRelationshipsFind';

export async function cookMealDelete(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationMealDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    try {
        const relationships = await cookMealRelationshipsFind(args.mealId, requestingSession, serverRuntime);
        if (relationships.deletionBlockedByRelationships) {
            throw new Error('cookMealDelete: meal is the sole option on a course');
        }

        const now = new Date();
        const updated = await serverRuntime.db
            .update(meals)
            .set({ deletedAt: now, updatedAt: now })
            .where(and(eq(meals.mealId, args.mealId), eq(meals.cookId, cookId), isNull(meals.deletedAt)))
            .returning({ mealId: meals.mealId });

        if (updated.length === 0) {
            throw new Error('cookMealDelete: meal not found');
        }

        await serverRuntime.publish.userUpdates({ userId: cookId });
        return { success: true, referenceId: args.mealId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
