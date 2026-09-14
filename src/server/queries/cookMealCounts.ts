import { count } from 'drizzle-orm';

import { meals } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCook, GqlSCookMealCriterion, GqlSCookMealsCountsArgs, GqlSSession } from '../graphql/generated';
import { cookMealCriterionWhere } from '../utils/cookMealCriterionWhere';

const COOK_COUNTS_CRITERIA_MAX = 20;

async function cookMealCountOne(cookId: string, criterion: GqlSCookMealCriterion, serverRuntime: ServerRuntime): Promise<number> {
    const where = cookMealCriterionWhere(cookId, criterion);

    const [row] = await serverRuntime.db.select({ value: count() }).from(meals).where(where);

    return row?.value ?? 0;
}

export async function cookMealCounts(
    { cookId }: GqlSCook,
    args: GqlSCookMealsCountsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<number[]> {
    try {
        const { criteria } = args;
        if (criteria.length === 0) {
            throw new Error('cookMealCounts: criteria must not be empty');
        }
        if (criteria.length > COOK_COUNTS_CRITERIA_MAX) {
            throw new Error('cookMealCounts: too many criteria');
        }

        return await Promise.all(criteria.map((criterion) => cookMealCountOne(cookId, criterion, serverRuntime)));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
