import { and, gt, ilike, inArray, or } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { supportRequests } from '../db/schema';
import type { GqlSAdminSupportRequestCriterion } from '../graphql/generated';
import { likeContainsPattern } from './likeContainsPattern';

/** Shared `WHERE` for `adminSupportRequestFindMany` / `adminSupportRequestCounts`. */
export function adminSupportRequestCriterionWhere(
    criterion: Pick<GqlSAdminSupportRequestCriterion, 'searchText' | 'statuses' | 'hasAdminUnread'>,
): SQL | undefined {
    const parts: SQL[] = [];

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
            )!,
        );
    }

    if (parts.length === 0) return undefined;
    if (parts.length === 1) return parts[0];
    return and(...parts);
}
