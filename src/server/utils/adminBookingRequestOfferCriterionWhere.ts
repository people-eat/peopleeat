import { and, gt, ilike, inArray, isNotNull, lte, or } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

import { bookingRequestOffers } from '../db/schema';
import type { GqlSAdminBookingRequestOfferCriterion } from '../graphql/generated';
import { likeContainsPattern } from './likeContainsPattern';

/** Shared `WHERE` for `adminBookingRequestOfferFindMany` / `adminBookingRequestOfferCounts`. */
export function adminBookingRequestOfferCriterionWhere(
    criterion: Pick<
        GqlSAdminBookingRequestOfferCriterion,
        'searchText' | 'cookIds' | 'paymentStatuses' | 'plannedPayoutDateTimeTo' | 'hasAdminChatReviewPending'
    >,
): SQL | undefined {
    const parts: SQL[] = [];

    if (criterion.cookIds && criterion.cookIds.length > 0) {
        parts.push(inArray(bookingRequestOffers.cookId, criterion.cookIds));
    }

    if (criterion.paymentStatuses && criterion.paymentStatuses.length > 0) {
        parts.push(inArray(bookingRequestOffers.paymentStatus, criterion.paymentStatuses));
    }

    if (criterion.plannedPayoutDateTimeTo != null) {
        parts.push(
            and(
                isNotNull(bookingRequestOffers.plannedPayoutDateTime),
                lte(bookingRequestOffers.plannedPayoutDateTime, criterion.plannedPayoutDateTimeTo),
            )!,
        );
    }

    if (criterion.hasAdminChatReviewPending === true) {
        parts.push(gt(bookingRequestOffers.adminChatReviewPendingCount, 0));
    } else if (criterion.hasAdminChatReviewPending === false) {
        parts.push(lte(bookingRequestOffers.adminChatReviewPendingCount, 0));
    }

    const pattern = likeContainsPattern(criterion.searchText);
    if (pattern) {
        // cookId / bookingRequestId are UUIDs — allow exact-ish contains search via cast text.
        parts.push(or(ilike(bookingRequestOffers.cookId, pattern), ilike(bookingRequestOffers.bookingRequestId, pattern))!);
    }

    if (parts.length === 0) return undefined;
    if (parts.length === 1) return parts[0];
    return and(...parts);
}
