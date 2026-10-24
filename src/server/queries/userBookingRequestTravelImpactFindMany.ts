import { eq } from 'drizzle-orm';

import { bookingRequestOfferPriceCalculate } from '../../shared/bookingRequestOfferPrice';
import { bookingRequestOffers, bookingRequestParticipants, bookingRequests, cooks, giftCards, promoCodes, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSUserBookingRequest,
    GqlSUserBookingRequestOfferTravelImpact,
    GqlSUserBookingRequestTravelImpactArgs,
} from '../graphql/generated';
import { bookingRequestOfferParticipantAmendmentPriceCalculate } from '../utils/bookingRequestOfferParticipantAmendmentPrice';
import { travelDistanceKmResolve } from '../utils/travelDistanceKmResolve';

/**
 * Preview driving-distance travel fee changes for a proposed venue on an owned
 * booking request. Used by the customer edit form before save.
 * Dual-accepted offers also return host totals via the amendment price helper
 * (Stripe minimum charge floor when PAYED) so the preview matches accept.
 */
export async function userBookingRequestTravelImpactFindMany(
    parent: Pick<GqlSUserBookingRequest, 'bookingRequestId' | 'exactEventAddress'>,
    args: Pick<GqlSUserBookingRequestTravelImpactArgs, 'exactEventAddress'>,
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
            bookingRequest: bookingRequests,
            cook: cooks,
            cookUser: users,
            giftCard: giftCards,
            promoCode: promoCodes,
        })
        .from(bookingRequestOffers)
        .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
        .innerJoin(cooks, eq(cooks.cookId, bookingRequestOffers.cookId))
        .innerJoin(users, eq(users.userId, cooks.cookId))
        .leftJoin(giftCards, eq(giftCards.giftCardId, bookingRequests.giftCardId))
        .leftJoin(promoCodes, eq(promoCodes.promoCodeId, bookingRequests.promoCodeId))
        .where(eq(bookingRequestOffers.bookingRequestId, parent.bookingRequestId));

    const existingParticipants = await serverRuntime.db
        .select()
        .from(bookingRequestParticipants)
        .where(eq(bookingRequestParticipants.bookingRequestId, parent.bookingRequestId));

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

        const dualAccepted = row.offer.userAccepted === true && row.offer.cookAccepted === true;
        let totalCentsCustomerBefore: number | null = null;
        let totalCentsCustomerAfter: number | null = null;
        if (dualAccepted) {
            const hostBefore = row.offer.totalCentsCustomer ?? row.offer.totalWithoutDiscountsCentsCustomer;
            const pricePreview = bookingRequestOfferParticipantAmendmentPriceCalculate(
                {
                    menuPriceCentsBefore: row.offer.menuPriceCents,
                    travelExpensesCentsAfter,
                    totalWithoutDiscountsCentsCustomerBefore: row.offer.totalWithoutDiscountsCentsCustomer,
                    totalCentsCustomerBefore: hostBefore,
                    giftCardAppliedCentsBefore: row.offer.giftCardAppliedCents,
                    giftCardBalanceCents: row.giftCard?.balanceCents ?? 0,
                    promoAmountCents: row.promoCode?.amountCents ?? 0,
                    participantsBefore: existingParticipants,
                    participantsAfter: existingParticipants,
                    scaleMenuByParticipants: false,
                    platformFeePercentCook: row.offer.platformFeePercentCook,
                    platformFeePercentCustomer: row.offer.platformFeePercentCustomer,
                    enforceStripeMinimumCustomerCharge: row.offer.paymentStatus === 'PAYED',
                },
                row.offer.payoutCentsCook,
            );
            totalCentsCustomerBefore = hostBefore;
            totalCentsCustomerAfter = pricePreview.totalCentsCustomerAfter;
        }

        impacts.push({
            bookingRequestOfferId: row.offer.bookingRequestOfferId,
            cookDisplay: row.cookUser.firstName.trim() || row.cookUser.emailAddress || 'Cook',
            travelDistanceKmBefore,
            travelDistanceKmAfter,
            travelExpensesCentsBefore,
            travelExpensesCentsAfter,
            totalCentsCustomerBefore,
            totalCentsCustomerAfter,
        });
    }

    return impacts;
}
