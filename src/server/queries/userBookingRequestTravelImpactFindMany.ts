import { eq } from 'drizzle-orm';

import { bookingRequestOfferPriceCalculate } from '../../shared/bookingRequestOfferPrice';
import { bookingRequestOffers, bookingRequests, cooks, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSUserBookingRequest,
    GqlSUserBookingRequestOfferTravelImpact,
    GqlSUserBookingRequestTravelImpactArgs,
} from '../graphql/generated';
import { travelDistanceKmResolve } from '../utils/travelDistanceKmResolve';

/**
 * Preview driving-distance travel fee changes for a proposed venue on an owned
 * booking request. Used by the customer edit form before save.
 */
export async function userBookingRequestTravelImpactFindMany(
    parent: GqlSUserBookingRequest,
    args: GqlSUserBookingRequestTravelImpactArgs,
    serverRuntime: ServerRuntime,
): Promise<GqlSUserBookingRequestOfferTravelImpact[]> {
    const address = args.exactEventAddress;
    const destination = {
        latitude: address.latitude,
        longitude: address.longitude,
    };

    const rows = await serverRuntime.db
        .select({
            offer: bookingRequestOffers,
            cook: cooks,
            cookUser: users,
        })
        .from(bookingRequestOffers)
        .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
        .innerJoin(cooks, eq(cooks.cookId, bookingRequestOffers.cookId))
        .innerJoin(users, eq(users.userId, cooks.cookId))
        .where(eq(bookingRequestOffers.bookingRequestId, parent.bookingRequestId));

    const impacts: GqlSUserBookingRequestOfferTravelImpact[] = [];

    for (const row of rows) {
        const origin = row.cook.exactTravelOriginAddress;
        if (!origin) continue;

        const travelDistanceKmBefore =
            row.offer.travelDistanceKm ??
            (await travelDistanceKmResolve(
                serverRuntime.places,
                { latitude: origin.latitude, longitude: origin.longitude },
                {
                    latitude: parent.exactEventAddress.latitude,
                    longitude: parent.exactEventAddress.longitude,
                },
            ));
        const travelDistanceKmAfter = await travelDistanceKmResolve(
            serverRuntime.places,
            { latitude: origin.latitude, longitude: origin.longitude },
            destination,
        );

        const travelExpensesCentsBefore =
            row.offer.travelDistanceKm != null
                ? row.offer.travelExpensesCents
                : Math.round(travelDistanceKmBefore * row.cook.travelExpensesAmount * 2);
        const travelExpensesCentsAfter = bookingRequestOfferPriceCalculate({
            menuPriceCents: row.offer.menuPriceCents,
            travelExpensesCents: Math.round(travelDistanceKmAfter * row.cook.travelExpensesAmount * 2),
        }).travelExpensesCents;

        impacts.push({
            bookingRequestOfferId: row.offer.bookingRequestOfferId,
            cookDisplay: row.cookUser.firstName.trim() || row.cookUser.emailAddress || 'Cook',
            travelDistanceKmBefore,
            travelDistanceKmAfter,
            travelExpensesCentsBefore,
            travelExpensesCentsAfter,
        });
    }

    return impacts;
}
