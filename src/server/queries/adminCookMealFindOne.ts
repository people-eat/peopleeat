import { eq } from 'drizzle-orm';

import { meals, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCookMeal, GqlSAdminCookMealArgs, GqlSSession } from '../graphql/generated';
import { toGqlAdminCookMeal } from '../mappers/toGqlAdminCookMeal';

/** Single cook meal for admin (including soft-deleted). */
export async function adminCookMealFindOne(
    args: GqlSAdminCookMealArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminCookMeal | null> {
    try {
        const [row] = await serverRuntime.db
            .select({
                meal: meals,
                cookFirstName: users.firstName,
                cookLastName: users.lastName,
            })
            .from(meals)
            .innerJoin(users, eq(users.userId, meals.cookId))
            .where(eq(meals.mealId, args.mealId))
            .limit(1);

        if (!row) return null;

        return toGqlAdminCookMeal(row.meal, `${row.cookFirstName} ${row.cookLastName}`.trim());
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
