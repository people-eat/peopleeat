import { eq } from 'drizzle-orm';

import { geoDistance } from '../../shared/geoDistance';
import { bookingRequestCooks, bookingRequestParticipants, bookingRequests, cooks, promoCodes, users } from '../db/schema';
import { cookCanCreateOffersDerive } from '../domain/cook';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminBookingRequest, GqlSAdminBookingRequestCookInTravelRadius } from '../graphql/generated';
import {
    bookingRequestOfferPriceGuidanceFromRequest,
    bookingRequestParticipantCounts,
} from '../mappers/bookingRequestOfferPriceGuidanceFromRequest';
import { adminBookingRequestCookSuggestedMenuPriceCents } from '../mappers/toGqlAdminBookingRequestOffer';
import { toGqlAdminCook } from '../mappers/toGqlAdminCook';
import { cookIsInTravelRadius } from '../utils/cookIsInTravelRadius';

/** Cooks who can create offers and cover the request venue (admin publication picker). */
export async function adminBookingRequestCooksInTravelRadiusFindMany(
    parent: GqlSAdminBookingRequest,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminBookingRequestCookInTravelRadius[]> {
    const [bookingRequest] = await serverRuntime.db
        .select()
        .from(bookingRequests)
        .where(eq(bookingRequests.bookingRequestId, parent.bookingRequestId))
        .limit(1);

    if (!bookingRequest) {
        return [];
    }

    const eventLocation = {
        latitude: bookingRequest.exactEventAddress.latitude,
        longitude: bookingRequest.exactEventAddress.longitude,
    };

    const [cookRows, notifiedRows, participantRows, promoRow] = await Promise.all([
        serverRuntime.db.select({ cook: cooks, status: users.status }).from(cooks).innerJoin(users, eq(users.userId, cooks.cookId)),
        serverRuntime.db
            .select({
                cookId: bookingRequestCooks.cookId,
                notifiedAt: bookingRequestCooks.notifiedAt,
            })
            .from(bookingRequestCooks)
            .where(eq(bookingRequestCooks.bookingRequestId, parent.bookingRequestId)),
        serverRuntime.db
            .select({ type: bookingRequestParticipants.type })
            .from(bookingRequestParticipants)
            .where(eq(bookingRequestParticipants.bookingRequestId, parent.bookingRequestId)),
        bookingRequest.promoCodeId
            ? serverRuntime.db
                  .select({ minimumTotalAmountCustomerCents: promoCodes.minimumTotalAmountCustomerCents })
                  .from(promoCodes)
                  .where(eq(promoCodes.promoCodeId, bookingRequest.promoCodeId))
                  .limit(1)
                  .then((rows) => rows[0] ?? null)
            : Promise.resolve(null),
    ]);

    const notifiedAtByCookId = new Map(
        notifiedRows.filter((row) => row.notifiedAt != null).map((row) => [row.cookId, row.notifiedAt as Date]),
    );
    const { participantsAdult, participantsDiscounted } = bookingRequestParticipantCounts(participantRows);
    const promoMinimumTotalAmountCustomerCents = promoRow?.minimumTotalAmountCustomerCents ?? null;

    const results: GqlSAdminBookingRequestCookInTravelRadius[] = [];

    for (const { cook, status } of cookRows) {
        if (!cookCanCreateOffersDerive(cook, status) || cook.cookId === bookingRequest.userId) {
            continue;
        }
        if (!cookIsInTravelRadius(cook, eventLocation) || !cook.exactTravelOriginAddress) {
            continue;
        }

        const estimatedTravelDistanceKm = geoDistance(cook.exactTravelOriginAddress, eventLocation);
        const estimatedTravelExpensesCents = Math.round(estimatedTravelDistanceKm * cook.travelExpensesAmount * 2);
        const guidance = bookingRequestOfferPriceGuidanceFromRequest({
            priceClassType: bookingRequest.priceClassType,
            participants: participantRows,
            estimatedTravelExpensesCents,
            promoMinimumTotalAmountCustomerCents,
        });

        results.push({
            cook: toGqlAdminCook(cook, status),
            estimatedTravelDistanceKm,
            estimatedTravelExpensesCents,
            suggestedMenuPriceCents: adminBookingRequestCookSuggestedMenuPriceCents({
                suggestedOfferAmountCents: guidance.suggestedOfferAmountCents,
                participantsAdult,
                participantsDiscounted,
            }),
            notifiedAt: notifiedAtByCookId.get(cook.cookId) ?? null,
        });
    }

    results.sort((a, b) => a.estimatedTravelDistanceKm - b.estimatedTravelDistanceKm);
    return results;
}
