import { and, eq, exists, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { bookingRequests, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminBookingRequestCriterion } from '../graphql/generated';
import { adminBookingRequestStatusWhere } from './adminBookingRequestStatusWhere';
import { likeContainsPattern } from './likeContainsPattern';

/** Shared `WHERE` for `adminBookingRequestFindMany` / `adminBookingRequestCounts`. */
export function adminBookingRequestCriterionWhere(
    criterion: Pick<
        GqlSAdminBookingRequestCriterion,
        'searchText' | 'userIds' | 'publicationStatuses' | 'statuses' | 'promoCodeId' | 'createdAtFrom' | 'createdAtTo'
    >,
    db: ServerRuntime['db'],
    now: Date = new Date(),
): SQL | undefined {
    const parts: SQL[] = [];

    if (criterion.promoCodeId) {
        parts.push(eq(bookingRequests.promoCodeId, criterion.promoCodeId));
    }

    if (criterion.userIds && criterion.userIds.length > 0) {
        parts.push(inArray(bookingRequests.userId, criterion.userIds));
    }

    if (criterion.publicationStatuses && criterion.publicationStatuses.length > 0) {
        parts.push(inArray(bookingRequests.publicationStatus, criterion.publicationStatuses));
    }

    const statusWhere = criterion.statuses ? adminBookingRequestStatusWhere(criterion.statuses, db, now) : undefined;
    if (statusWhere) {
        parts.push(statusWhere);
    }

    if (criterion.createdAtFrom != null) {
        parts.push(gte(bookingRequests.createdAt, criterion.createdAtFrom));
    }

    if (criterion.createdAtTo != null) {
        parts.push(lte(bookingRequests.createdAt, criterion.createdAtTo));
    }

    const pattern = likeContainsPattern(criterion.searchText);
    if (pattern) {
        parts.push(
            or(
                ilike(bookingRequests.occasion, pattern),
                ilike(bookingRequests.originalMessage, pattern),
                ilike(sql`(${bookingRequests.exactEventAddress}->>'city')`, pattern),
                ilike(sql`(${bookingRequests.exactEventAddress}->>'displayText')`, pattern),
                exists(
                    db
                        .select({ userId: users.userId })
                        .from(users)
                        .where(
                            and(
                                eq(users.userId, bookingRequests.userId),
                                or(ilike(users.emailAddress, pattern), ilike(users.firstName, pattern), ilike(users.lastName, pattern)),
                            ),
                        ),
                ),
            )!,
        );
    }

    if (parts.length === 0) return undefined;
    if (parts.length === 1) return parts[0];
    return and(...parts);
}
