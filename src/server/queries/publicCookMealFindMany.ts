import { and, desc, eq } from 'drizzle-orm';

import { meals } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSPublicCook, GqlSPublicCookMeal } from '../graphql/generated';
import { toGqlPublicCookMeal } from '../mappers/toGqlPublicCookMeal';
import { publicCookMealCatalogWhere } from '../utils/publicCookMealCatalogWhere';

/** Published, non-deleted meals with an image for a public cook profile. */
export async function publicCookMealFindMany(
    { cookId }: Pick<GqlSPublicCook, 'cookId'>,
    serverRuntime: ServerRuntime,
): Promise<GqlSPublicCookMeal[]> {
    const now = new Date();
    const rows = await serverRuntime.db
        .select()
        .from(meals)
        .where(and(eq(meals.cookId, cookId), publicCookMealCatalogWhere(now)))
        .orderBy(desc(meals.publishedAt));

    return rows.map(toGqlPublicCookMeal);
}
