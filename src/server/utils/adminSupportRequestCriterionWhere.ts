import { and, eq, exists, gt, ilike, inArray, or } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { supportRequests, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminSupportRequestCriterion } from '../graphql/generated';
import { likeContainsPattern } from './likeContainsPattern';
import { userNameIlikeMatch } from './userNameIlikeMatch';

/** Shared `WHERE` for `adminSupportRequestFindMany` / `adminSupportRequestCounts`. */
export function adminSupportRequestCriterionWhere(
    criterion: Pick<GqlSAdminSupportRequestCriterion, 'searchText' | 'supportRequestIds' | 'statuses' | 'hasAdminUnread'>,
    db: ServerRuntime['db'],
): SQL | undefined {
    const parts: SQL[] = [];

    if (criterion.supportRequestIds && criterion.supportRequestIds.length > 0) {
        parts.push(inArray(supportRequests.supportRequestId, criterion.supportRequestIds));
    }

    if (criterion.statuses && criterion.statuses.length > 0) {
        parts.push(inArray(supportRequests.status, criterion.statuses));
    }

    if (criterion.hasAdminUnread === true) {
        parts.push(gt(supportRequests.adminUnreadNotificationCount, 0));
    }

    const pattern = likeContainsPattern(criterion.searchText);
    if (pattern) {
        parts.push(
            or(
                ilike(supportRequests.subject, pattern),
                ilike(supportRequests.supportRequestId, pattern),
                ilike(supportRequests.userId, pattern),
                exists(
                    db
                        .select({ userId: users.userId })
                        .from(users)
                        .where(and(eq(users.userId, supportRequests.userId), userNameIlikeMatch(users, pattern))),
                ),
            )!,
        );
    }

    if (parts.length === 0) return undefined;
    if (parts.length === 1) return parts[0];
    return and(...parts);
}
