import { desc, eq } from 'drizzle-orm';

import { bookingRequestOffers, bookingRequests } from '../db/schema';
import { bookingRequestOfferListBucketDerive } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCook, GqlSCookBookingRequestOffer, GqlSCookBookingRequestOffersArgs, GqlSSession } from '../graphql/generated';
import { cookBookingRequestOfferHydrate } from '../utils/cookBookingRequestOfferHydrate';

export async function cookBookingRequestOfferFindMany(
    { cookId }: GqlSCook,
    args: GqlSCookBookingRequestOffersArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookBookingRequestOffer[]> {
    try {
        const rows = await serverRuntime.db
            .select({
                offer: bookingRequestOffers,
                bookingRequest: bookingRequests,
            })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(eq(bookingRequestOffers.cookId, cookId))
            .orderBy(desc(bookingRequestOffers.createdAt));

        const offers = await cookBookingRequestOfferHydrate(rows, serverRuntime);
        const bucket = args.criterion?.bucket;
        if (bucket == null) {
            return offers;
        }
        return offers.filter((offer) => bookingRequestOfferListBucketDerive(offer.status) === bucket);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
