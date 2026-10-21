import { eq } from 'drizzle-orm';

import {
    bookingRequestOfferMenuPriceScaleByPaidParticipants,
    bookingRequestOfferPriceCalculate,
} from '../../shared/bookingRequestOfferPrice';
import { bookingRequestPaidParticipants } from '../../shared/bookingRequestOfferPriceGuidance';
import { bookingRequestOffers, bookingRequestParticipants, bookingRequests, cooks, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSUserBookingRequest,
    GqlSUserBookingRequestOfferPriceImpact,
    GqlSUserBookingRequestPriceImpactArgs,
} from '../graphql/generated';

/**
 * Preview menu / total changes for a proposed headcount on an owned booking
 * request. Used by the customer edit form before save.
 */
export async function userBookingRequestPriceImpactFindMany(
    parent: GqlSUserBookingRequest,
    args: GqlSUserBookingRequestPriceImpactArgs,
    serverRuntime: ServerRuntime,
): Promise<GqlSUserBookingRequestOfferPriceImpact[]> {
    const participantsAdultAfter = Math.max(0, args.participantsAdult);
    const participantsDiscountedAfter = Math.max(0, args.participantsDiscounted);
    const paidAfter = bookingRequestPaidParticipants(participantsAdultAfter, participantsDiscountedAfter);
    if (paidAfter <= 0) {
        return [];
    }

    const existingParticipants = await serverRuntime.db
        .select()
        .from(bookingRequestParticipants)
        .where(eq(bookingRequestParticipants.bookingRequestId, parent.bookingRequestId));
    const adultsBefore = existingParticipants.filter((participant) => participant.type === 'ADULT').length;
    const discountedBefore = existingParticipants.filter((participant) => participant.type === 'DISCOUNTED').length;
    const paidBefore = bookingRequestPaidParticipants(adultsBefore, discountedBefore);
    if (paidBefore <= 0) {
        return [];
    }

    const rows = await serverRuntime.db
        .select({
            offer: bookingRequestOffers,
            cookUser: users,
        })
        .from(bookingRequestOffers)
        .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
        .innerJoin(cooks, eq(cooks.cookId, bookingRequestOffers.cookId))
        .innerJoin(users, eq(users.userId, cooks.cookId))
        .where(eq(bookingRequestOffers.bookingRequestId, parent.bookingRequestId));

    return rows.map((row) => {
        const menuPriceCentsAfter = bookingRequestOfferMenuPriceScaleByPaidParticipants({
            menuPriceCents: row.offer.menuPriceCents,
            paidParticipantsBefore: paidBefore,
            paidParticipantsAfter: paidAfter,
        });
        const priceAfter = bookingRequestOfferPriceCalculate({
            menuPriceCents: menuPriceCentsAfter,
            travelExpensesCents: row.offer.travelExpensesCents,
        });
        return {
            bookingRequestOfferId: row.offer.bookingRequestOfferId,
            cookDisplay: row.cookUser.firstName.trim() || row.cookUser.emailAddress || 'Cook',
            menuPriceCentsBefore: row.offer.menuPriceCents,
            menuPriceCentsAfter: priceAfter.menuPriceCents,
            totalWithoutDiscountsCentsCustomerBefore: row.offer.totalWithoutDiscountsCentsCustomer,
            totalWithoutDiscountsCentsCustomerAfter: priceAfter.totalWithoutDiscountsCentsCustomer,
            payoutCentsCookBefore: row.offer.payoutCentsCook,
            payoutCentsCookAfter: priceAfter.payoutCentsCook,
        };
    });
}
