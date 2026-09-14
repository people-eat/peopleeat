import { and, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { sessions } from '../db/schema';
import type { GqlSAdminSessionCriterion } from '../graphql/generated';
import { likeContainsPattern } from './likeContainsPattern';

/** Shared `WHERE` for `adminSessionFindMany` / `adminSessionCounts`. Returns
 * `false` when `kinds` is empty (match nothing), matching
 * `AdminUserCriterion.types` / `AdminLogCriterion.levels`. */
export function adminSessionCriterionWhere(
    criterion: Pick<GqlSAdminSessionCriterion, 'searchText' | 'kinds' | 'userIds'>,
): SQL | undefined | false {
    if (criterion.kinds.length === 0) {
        return false;
    }

    const kindClauses: SQL[] = [];
    if (criterion.kinds.includes('human')) {
        kindClauses.push(eq(sessions.isBot, false));
    }
    if (criterion.kinds.includes('bot')) {
        kindClauses.push(eq(sessions.isBot, true));
    }

    const pattern = likeContainsPattern(criterion.searchText);
    const searchClause = pattern
        ? or(
              // uuid columns need a text cast for ILIKE contains matching
              ilike(sql`(${sessions.sessionId})::text`, pattern),
              ilike(sql`(${sessions.userId})::text`, pattern),
              ilike(sessions.userAgent, pattern),
              ilike(sessions.landingPath, pattern),
              ilike(sessions.referrer, pattern),
              ilike(sessions.ipHash, pattern),
          )
        : undefined;

    return and(
        or(...kindClauses),
        criterion.userIds && criterion.userIds.length > 0 ? inArray(sessions.userId, criterion.userIds) : undefined,
        searchClause,
    );
}
