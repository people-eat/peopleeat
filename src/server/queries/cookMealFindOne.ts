import { and, eq, isNull } from 'drizzle-orm';

import { meals } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCook, GqlSCookMeal, GqlSCookMealArgs, GqlSSession } from '../graphql/generated';
import { toGqlCookMeal } from '../mappers/toGqlCookMeal';

export async function cookMealFindOne(
    { cookId }: GqlSCook,
    args: GqlSCookMealArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookMeal | null> {
    try {
        const [row] = await serverRuntime.db
            .select()
            .from(meals)
            .where(and(eq(meals.mealId, args.mealId), eq(meals.cookId, cookId), isNull(meals.deletedAt)))
            .limit(1);

        return row ? toGqlCookMeal(row) : null;
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
