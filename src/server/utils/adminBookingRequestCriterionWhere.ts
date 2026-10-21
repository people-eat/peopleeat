import { and, eq, exists, gte, ilike, inArray, isNotNull, lte, or, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { bookingRequestCooks, bookingRequests, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminBookingRequestCriterion } from '../graphql/generated';
import { adminBookingRequestStatusWhere } from './adminBookingRequestStatusWhere';
import { likeContainsPattern } from './likeContainsPattern';
import { userNameIlikeMatch } from './userNameIlikeMatch';

/** Shared `WHERE` for `adminBookingRequestFindMany` / `adminBookingRequestCounts`. */
export function adminBookingRequestCriterionWhere(
    criterion: Pick<
        GqlSAdminBookingRequestCriterion,
        | 'searchText'
        | 'userIds'
        | 'bookingRequestIds'
        | 'cookIds'
        | 'notifiedOnly'
        | 'publicationStatuses'
        | 'statuses'
        | 'promoCodeId'
        | 'createdAtFrom'
        | 'createdAtTo'
    >,
    db: ServerRuntime['db'],
    now: Date = new Date(),
): SQL | undefined {
    const parts: SQL[] = [];

    if (criterion.promoCodeId) {
        parts.push(eq(bookingRequests.promoCodeId, criterion.promoCodeId));
    }

    if (criterion.bookingRequestIds && criterion.bookingRequestIds.length > 0) {
        parts.push(inArray(bookingRequests.bookingRequestId, criterion.bookingRequestIds));
    }

    if (criterion.userIds && criterion.userIds.length > 0) {
        parts.push(inArray(bookingRequests.userId, criterion.userIds));
    }

    if (criterion.cookIds && criterion.cookIds.length > 0) {
        const poolParts: SQL[] = [
            eq(bookingRequestCooks.bookingRequestId, bookingRequests.bookingRequestId),
            inArray(bookingRequestCooks.cookId, criterion.cookIds),
        ];
        if (criterion.notifiedOnly === true) {
            poolParts.push(isNotNull(bookingRequestCooks.notifiedAt));
        }
        parts.push(
            exists(
                db
                    .select({ bookingRequestId: bookingRequestCooks.bookingRequestId })
                    .from(bookingRequestCooks)
                    .where(and(...poolParts)),
            ),
        );
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
                                or(ilike(users.emailAddress, pattern), userNameIlikeMatch(users, pattern)),
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
