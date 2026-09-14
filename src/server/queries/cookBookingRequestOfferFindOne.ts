import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCook, GqlSCookBookingRequestOffer, GqlSCookBookingRequestOfferArgs, GqlSSession } from '../graphql/generated';
import { cookBookingRequestOfferFindMany } from './cookBookingRequestOfferFindMany';

export async function cookBookingRequestOfferFindOne(
    parent: GqlSCook,
    args: GqlSCookBookingRequestOfferArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookBookingRequestOffer | null> {
    const offers = await cookBookingRequestOfferFindMany(parent, {}, requestingSession, serverRuntime);
    return offers.find((offer) => offer.bookingRequestOfferId === args.bookingRequestOfferId) ?? null;
}
