import { and, eq, ilike, isNull } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { menus } from '../db/schema';
import type { GqlSCookMenuCriterion } from '../graphql/generated';
import { likeContainsPattern } from './likeContainsPattern';

/** Shared `WHERE` for `cookMenuCounts` (live inventory only). */
export function cookMenuCriterionWhere(cookId: string, criterion: Pick<GqlSCookMenuCriterion, 'searchText'>): SQL {
    const parts: SQL[] = [eq(menus.cookId, cookId), isNull(menus.deletedAt)];

    const pattern = likeContainsPattern(criterion.searchText);
    if (pattern) {
        parts.push(ilike(menus.title, pattern));
    }

    return and(...parts)!;
}
