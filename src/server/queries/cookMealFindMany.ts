import { and, desc, eq, isNull } from 'drizzle-orm';

import { meals } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCook, GqlSCookMeal, GqlSSession } from '../graphql/generated';
import { toGqlCookMeal } from '../mappers/toGqlCookMeal';

export async function cookMealFindMany(
    { cookId }: GqlSCook,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookMeal[]> {
    try {
        const rows = await serverRuntime.db
            .select()
            .from(meals)
            .where(and(eq(meals.cookId, cookId), isNull(meals.deletedAt)))
            .orderBy(desc(meals.createdAt));

        return rows.map(toGqlCookMeal);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
