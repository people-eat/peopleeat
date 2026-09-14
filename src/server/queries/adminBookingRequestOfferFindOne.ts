import { eq } from 'drizzle-orm';

import { bookingRequestOffers, bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminBookingRequestOffer, GqlSAdminBookingRequestOfferArgs, GqlSSession } from '../graphql/generated';
import { adminBookingRequestOfferHydrate } from '../utils/adminBookingRequestOfferHydrate';

export async function adminBookingRequestOfferFindOne(
    args: GqlSAdminBookingRequestOfferArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminBookingRequestOffer | null> {
    try {
        const [row] = await serverRuntime.db
            .select({
                offer: bookingRequestOffers,
                bookingRequest: bookingRequests,
            })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(eq(bookingRequestOffers.bookingRequestOfferId, args.bookingRequestOfferId))
            .limit(1);
        if (!row) return null;

        const [hydrated] = await adminBookingRequestOfferHydrate([row], serverRuntime);
        return hydrated ?? null;
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
