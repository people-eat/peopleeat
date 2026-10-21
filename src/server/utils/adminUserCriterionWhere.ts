import { and, eq, exists, ilike, inArray, notExists, or } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { admins, cooks, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminUserCriterion } from '../graphql/generated';
import { likeContainsPattern } from './likeContainsPattern';
import { userNameIlikeMatch } from './userNameIlikeMatch';

/** Shared `WHERE` for `adminUserFindMany` / `adminUserCounts`. Returns `false`
 * when `types` is empty (match nothing), matching `AdminLogCriterion.levels`. */
export function adminUserCriterionWhere(
    criterion: Pick<GqlSAdminUserCriterion, 'searchText' | 'types' | 'userIds' | 'isApprovedByAdmin' | 'status'>,
    db: ServerRuntime['db'],
): SQL | undefined | false {
    if (criterion.types.length === 0) {
        return false;
    }

    const typeClauses: SQL[] = [];
    if (criterion.types.includes('customer')) {
        typeClauses.push(notExists(db.select().from(cooks).where(eq(cooks.cookId, users.userId))));
    }
    if (criterion.types.includes('cook')) {
        typeClauses.push(exists(db.select().from(cooks).where(eq(cooks.cookId, users.userId))));
    }
    if (criterion.types.includes('admin')) {
        typeClauses.push(exists(db.select().from(admins).where(eq(admins.adminId, users.userId))));
    }

    const pattern = likeContainsPattern(criterion.searchText);
    const searchClause = pattern ? or(userNameIlikeMatch(users, pattern), ilike(users.emailAddress, pattern)) : undefined;

    const userIdsClause = criterion.userIds && criterion.userIds.length > 0 ? inArray(users.userId, criterion.userIds) : undefined;

    const approvalClause =
        criterion.isApprovedByAdmin === null || criterion.isApprovedByAdmin === undefined
            ? undefined
            : exists(
                  db
                      .select()
                      .from(cooks)
                      .where(and(eq(cooks.cookId, users.userId), eq(cooks.isApprovedByAdmin, criterion.isApprovedByAdmin))),
              );

    const statusClause = criterion.status === null || criterion.status === undefined ? undefined : eq(users.status, criterion.status);

    return and(or(...typeClauses), userIdsClause, searchClause, approvalClause, statusClause);
}
