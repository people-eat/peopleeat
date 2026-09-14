import { and, eq, exists, ilike, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import type { Database } from '../db';
import { cooks, meals, users } from '../db/schema';
import type { GqlSPublicCookFindManyCriterion } from '../graphql/generated';
import { likeContainsPattern } from './likeContainsPattern';
import { publicCookMealCatalogWhere } from './publicCookMealCatalogWhere';

/** Visible + approved + ACTIVE user + ≥1 published meal with an image. */
export function publicCookListedWhere(db: Database): SQL {
    const now = new Date();
    return and(
        eq(cooks.isVisible, true),
        eq(cooks.isApprovedByAdmin, true),
        eq(users.status, 'ACTIVE'),
        exists(
            db
                .select({ mealId: meals.mealId })
                .from(meals)
                .where(and(eq(meals.cookId, cooks.cookId), publicCookMealCatalogWhere(now))),
        ),
    )!;
}

/** Optional `searchText` for `publicCook.findMany` (name, bio, cuisine, city). */
export function publicCookFindManySearchWhere(
    criterion: Pick<GqlSPublicCookFindManyCriterion, 'searchText'> | null | undefined,
): SQL | undefined {
    const pattern = likeContainsPattern(criterion?.searchText);
    if (!pattern) return undefined;
    return or(
        ilike(users.firstName, pattern),
        ilike(cooks.biography, pattern),
        ilike(cooks.biographySummary, pattern),
        ilike(cooks.cuisineStyle, pattern),
        ilike(cooks.cookingPhilosophy, pattern),
        ilike(sql`(${cooks.exactTravelOriginAddress}->>'city')`, pattern),
        ilike(cooks.legacyCityName, pattern),
    );
}
