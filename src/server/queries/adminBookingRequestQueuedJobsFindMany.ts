import { eq } from 'drizzle-orm';

import { bookingRequestOffers } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminBookingRequest, GqlSAdminQueuedJob, GqlSSession } from '../graphql/generated';
import {
    adminBookingRequestOfferQueuedJobsByOfferIdFindMany,
    adminBookingRequestScopedQueuedJobsFindMany,
} from './adminBookingRequestOfferQueuedJobsByOfferIdFindMany';

/**
 * Pending pg-boss jobs for a booking request: request-scoped (expire / no-offers)
 * plus every offer-scoped queue. Sorted by `startAfter`.
 */
export async function adminBookingRequestQueuedJobsFindMany(
    parent: GqlSAdminBookingRequest,
    _requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminQueuedJob[]> {
    const offerIds =
        parent.offers.length > 0
            ? parent.offers.map((offer) => offer.bookingRequestOfferId)
            : await serverRuntime.db
                  .select({ bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId })
                  .from(bookingRequestOffers)
                  .where(eq(bookingRequestOffers.bookingRequestId, parent.bookingRequestId))
                  .then((rows) => rows.map((row) => row.bookingRequestOfferId));

    const [scopedJobs, ...offerBatches] = await Promise.all([
        adminBookingRequestScopedQueuedJobsFindMany(parent.bookingRequestId, serverRuntime),
        ...offerIds.map((bookingRequestOfferId) =>
            adminBookingRequestOfferQueuedJobsByOfferIdFindMany(bookingRequestOfferId, serverRuntime),
        ),
    ]);

    return [...scopedJobs, ...offerBatches.flat()].sort((a, b) => a.startAfter.getTime() - b.startAfter.getTime());
}
