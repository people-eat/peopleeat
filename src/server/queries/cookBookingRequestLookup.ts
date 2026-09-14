import { and, eq } from 'drizzle-orm';

import { bookingRequestCooks, bookingRequestOffers, bookingRequests, cooks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCook, GqlSCookBookingRequestLookupArgs, GqlSCookBookingRequestLookupResult, GqlSSession } from '../graphql/generated';
import { cookBookingRequestHydrate } from '../utils/cookBookingRequestHydrate';
import { cookIsEligibleForBookingRequestPool } from '../utils/cookBookingRequestPoolEligibility';

const notFound: GqlSCookBookingRequestLookupResult = {
    gqlTypeName: 'CookBookingRequestNotFound',
    _: null,
};

/**
 * Pool deep-link lookup. Reasons only when the cook is pool-eligible; every
 * other denial is identical NotFound (no existence oracle, no request PII).
 */
export async function cookBookingRequestLookup(
    { cookId }: GqlSCook,
    args: GqlSCookBookingRequestLookupArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookBookingRequestLookupResult> {
    try {
        const [cook] = await serverRuntime.db.select().from(cooks).where(eq(cooks.cookId, cookId)).limit(1);
        if (!cook) {
            return notFound;
        }

        const [bookingRequest] = await serverRuntime.db
            .select()
            .from(bookingRequests)
            .where(eq(bookingRequests.bookingRequestId, args.bookingRequestId))
            .limit(1);
        if (!bookingRequest) {
            return notFound;
        }

        const [affinity] = await serverRuntime.db
            .select()
            .from(bookingRequestCooks)
            .where(and(eq(bookingRequestCooks.cookId, cookId), eq(bookingRequestCooks.bookingRequestId, args.bookingRequestId)))
            .limit(1);

        if (!cookIsEligibleForBookingRequestPool(cook, bookingRequest, affinity ?? null)) {
            return notFound;
        }

        const [ownOffer] = await serverRuntime.db
            .select({ bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId })
            .from(bookingRequestOffers)
            .where(and(eq(bookingRequestOffers.bookingRequestId, args.bookingRequestId), eq(bookingRequestOffers.cookId, cookId)))
            .limit(1);
        if (ownOffer) {
            return {
                gqlTypeName: 'CookBookingRequestOfferAlreadyExists',
                bookingRequestOfferId: ownOffer.bookingRequestOfferId,
            };
        }

        const [acceptedOffer] = await serverRuntime.db
            .select({ bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId })
            .from(bookingRequestOffers)
            .where(
                and(
                    eq(bookingRequestOffers.bookingRequestId, args.bookingRequestId),
                    eq(bookingRequestOffers.userAccepted, true),
                    eq(bookingRequestOffers.cookAccepted, true),
                ),
            )
            .limit(1);
        if (acceptedOffer) {
            return { gqlTypeName: 'CookBookingRequestTaken', _: null };
        }

        if (bookingRequest.canceledAt != null) {
            return { gqlTypeName: 'CookBookingRequestCanceled', _: null };
        }

        const now = new Date();
        if (bookingRequest.expiresAt != null && bookingRequest.expiresAt < now) {
            return { gqlTypeName: 'CookBookingRequestExpired', _: null };
        }

        const [hydrated] = await cookBookingRequestHydrate(cook, [{ bookingRequest, details: affinity ?? null }], serverRuntime);
        if (!hydrated) {
            return notFound;
        }

        return {
            gqlTypeName: 'CookBookingRequestAvailable',
            bookingRequest: hydrated,
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
