import { count, eq } from 'drizzle-orm';

import { meals, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCookMealCriterion, GqlSAdminCookMealsCountsArgs, GqlSSession } from '../graphql/generated';
import { adminCookMealCriterionWhere } from '../utils/adminCookMealCriterionWhere';

const ADMIN_COUNTS_CRITERIA_MAX = 20;

async function adminCookMealCountOne(criterion: GqlSAdminCookMealCriterion, serverRuntime: ServerRuntime): Promise<number> {
    const where = adminCookMealCriterionWhere(criterion);

    const [row] = await serverRuntime.db
        .select({ value: count() })
        .from(meals)
        .innerJoin(users, eq(users.userId, meals.cookId))
        .where(where);

    return row?.value ?? 0;
}

export async function adminCookMealCounts(
    args: GqlSAdminCookMealsCountsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<number[]> {
    try {
        const { criteria } = args;
        if (criteria.length === 0) {
            throw new Error('adminCookMealCounts: criteria must not be empty');
        }
        if (criteria.length > ADMIN_COUNTS_CRITERIA_MAX) {
            throw new Error('adminCookMealCounts: too many criteria');
        }

        return await Promise.all(criteria.map((criterion) => adminCookMealCountOne(criterion, serverRuntime)));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
