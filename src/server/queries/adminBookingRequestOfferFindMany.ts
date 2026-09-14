import { asc, desc, eq, sql } from 'drizzle-orm';

import { bookingRequestOffers, bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminBookingRequestOffer, GqlSAdminBookingRequestOffersArgs, GqlSSession } from '../graphql/generated';
import { adminBookingRequestOfferCriterionWhere } from '../utils/adminBookingRequestOfferCriterionWhere';
import { adminBookingRequestOfferHydrate } from '../utils/adminBookingRequestOfferHydrate';
import { findManySkip, findManyTake } from '../utils/findManyTake';

export async function adminBookingRequestOfferFindMany(
    args: GqlSAdminBookingRequestOffersArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminBookingRequestOffer[]> {
    try {
        const criterion = args.criterion;
        const where = adminBookingRequestOfferCriterionWhere(criterion);
        const orderBy =
            criterion.hasAdminChatReviewPending === true
                ? [sql`${bookingRequestOffers.adminChatReviewedAt} ASC NULLS FIRST`, asc(bookingRequestOffers.createdAt)]
                : criterion.plannedPayoutDateTimeTo != null
                  ? [asc(bookingRequestOffers.plannedPayoutDateTime)]
                  : [desc(bookingRequestOffers.createdAt)];

        const rows = await serverRuntime.db
            .select({
                offer: bookingRequestOffers,
                bookingRequest: bookingRequests,
            })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(where)
            .orderBy(...orderBy)
            .limit(findManyTake(criterion.take))
            .offset(findManySkip(criterion.skip));

        return adminBookingRequestOfferHydrate(rows, serverRuntime);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
