import { asc, desc, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { bookingRequests, supportRequestMessages, supportRequests } from '../db/schema';
import type { GqlSAdminSupportRequestCriterion, GqlSAdminSupportRequestSortField } from '../graphql/generated';

function adminSupportRequestSortFieldResolve(
    criterion: Pick<GqlSAdminSupportRequestCriterion, 'sortField'>,
): GqlSAdminSupportRequestSortField {
    return criterion.sortField ?? 'lastMessageAt';
}

/** Correlated max message time; falls back to case `createdAt` when no messages. */
function supportRequestLastMessageAtSql(): SQL {
    return sql`coalesce((
        select max(${supportRequestMessages.createdAt})
        from ${supportRequestMessages}
        where ${supportRequestMessages.supportRequestId} = ${supportRequests.supportRequestId}
    ), ${supportRequests.createdAt})`;
}

/**
 * `ORDER BY` for admin support-request lists. Fixed direction per field:
 * `lastMessageAt` / `createdAt` newest first; `bookingDateTime` soonest first
 * (null booking last). Optional unread-first pin before the field sort.
 */
export function adminSupportRequestOrderBy(criterion: Pick<GqlSAdminSupportRequestCriterion, 'sortField' | 'unreadFirst'>): SQL[] {
    const sortField = adminSupportRequestSortFieldResolve(criterion);
    const unreadFirst = criterion.unreadFirst !== false;

    const fieldOrder: SQL = (() => {
        switch (sortField) {
            case 'createdAt':
                return desc(supportRequests.createdAt);
            case 'bookingDateTime':
                return asc(sql`${bookingRequests.dateTime} nulls last`);
            case 'lastMessageAt':
                return desc(supportRequestLastMessageAtSql());
        }
    })();

    if (!unreadFirst) {
        return [fieldOrder];
    }

    return [desc(sql`${supportRequests.adminUnreadNotificationCount} > 0`), fieldOrder];
}
