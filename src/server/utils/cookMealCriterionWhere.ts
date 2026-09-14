import { and, eq, ilike, isNull } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { meals } from '../db/schema';
import type { GqlSCookMealCriterion } from '../graphql/generated';
import { likeContainsPattern } from './likeContainsPattern';

/** Shared `WHERE` for `cookMealCounts` (live inventory only). */
export function cookMealCriterionWhere(cookId: string, criterion: Pick<GqlSCookMealCriterion, 'searchText'>): SQL {
    const parts: SQL[] = [eq(meals.cookId, cookId), isNull(meals.deletedAt)];

    const pattern = likeContainsPattern(criterion.searchText);
    if (pattern) {
        parts.push(ilike(meals.title, pattern));
    }

    return and(...parts)!;
}
