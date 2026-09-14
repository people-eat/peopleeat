import { and, eq, isNull } from 'drizzle-orm';

import { meals } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationCookMealDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { cookMealRelationshipsFind } from '../utils/cookMealRelationshipsFind';

/** Admin soft-delete of any cook meal. Same sole-option gate as cook `mealDelete`. */
export async function adminCookMealDelete(
    { adminId }: GqlSAdminMutation,
    args: GqlSAdminMutationCookMealDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const [current] = await serverRuntime.db
            .select({ cookId: meals.cookId })
            .from(meals)
            .where(and(eq(meals.mealId, args.mealId), isNull(meals.deletedAt)))
            .limit(1);

        if (!current) {
            throw new Error('adminCookMealDelete: meal not found');
        }

        const relationships = await cookMealRelationshipsFind(args.mealId, requestingSession, serverRuntime);
        if (relationships.deletionBlockedByRelationships) {
            throw new Error('adminCookMealDelete: meal is the sole option on a course');
        }

        const now = new Date();
        const updated = await serverRuntime.db
            .update(meals)
            .set({ deletedAt: now, updatedAt: now })
            .where(and(eq(meals.mealId, args.mealId), eq(meals.cookId, current.cookId), isNull(meals.deletedAt)))
            .returning({ mealId: meals.mealId });

        if (updated.length === 0) {
            throw new Error('adminCookMealDelete: meal not found');
        }

        await Promise.all([serverRuntime.publish.userUpdates({ userId: current.cookId }), serverRuntime.publish.adminUpdates()]);
        return { success: true, referenceId: args.mealId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
