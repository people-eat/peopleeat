import { and, ilike, inArray } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { logs } from '../db/schema';
import type { GqlSAdminLogCriterion } from '../graphql/generated';
import { likeContainsPattern } from './likeContainsPattern';

/** Shared `WHERE` for `adminLogFindMany` / `adminLogCounts`. Returns `false`
 * when `levels` is empty (match nothing), matching `AdminUserCriterion.types`
 * / `AdminSessionCriterion.kinds`. */
export function adminLogCriterionWhere(criterion: Pick<GqlSAdminLogCriterion, 'searchText' | 'levels'>): SQL | undefined | false {
    if (criterion.levels.length === 0) {
        return false;
    }

    const pattern = likeContainsPattern(criterion.searchText);
    return and(inArray(logs.level, criterion.levels), pattern ? ilike(logs.message, pattern) : undefined);
}
