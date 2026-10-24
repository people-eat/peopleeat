import { and, asc, eq, inArray } from 'drizzle-orm';

import { DEFAULT_LOCALE } from '../../shared/locale';
import { bookingRequestOffers, bookingRequestParticipants, cookCallSlotBookings, menus, promoCodes } from '../db/schema';
import type { BookingRequest, BookingRequestOffer } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCookBookingRequestOffer } from '../graphql/generated';
import { toGqlCookBookingRequestOffer } from '../mappers/toGqlCookBookingRequestOffer';
import { toGqlCookBookingRequestOfferContext } from '../mappers/toGqlCookBookingRequestOfferContext';
import { cookMenusWithCourses } from './cookMenuHydrate';
import { publicUsersByIdFindMany } from './publicUserHydrate';

type CookBookingRequestOfferRow = {
    offer: BookingRequestOffer;
    bookingRequest: BookingRequest;
};

/** Batch-load nested cook offer fields (call bookings, suggested menus, accept flags, request context). */
export async function cookBookingRequestOfferHydrate(
    rows: CookBookingRequestOfferRow[],
    serverRuntime: ServerRuntime,
): Promise<GqlSCookBookingRequestOffer[]> {
    if (rows.length === 0) return [];

    const offerIds = rows.map((row) => row.offer.bookingRequestOfferId);
    const bookingRequestIds = [...new Set(rows.map((row) => row.offer.bookingRequestId))];
    const customerUserIds = [...new Set(rows.map((row) => row.bookingRequest.userId))];
    const promoCodeIds = [...new Set(rows.map((row) => row.bookingRequest.promoCodeId).filter((id): id is string => id != null))];

    const [callBookingRows, suggestedMenuRows, siblingOffers, participantRows, publicUsersResult, promoRows] = await Promise.all([
        serverRuntime.db
            .select()
            .from(cookCallSlotBookings)
            .where(inArray(cookCallSlotBookings.bookingRequestOfferId, offerIds))
            .orderBy(asc(cookCallSlotBookings.startAt)),
        serverRuntime.db.select().from(menus).where(inArray(menus.bookingRequestOfferId, offerIds)),
        serverRuntime.db
            .select()
            .from(bookingRequestOffers)
            .where(
                and(
                    inArray(bookingRequestOffers.bookingRequestId, bookingRequestIds),
                    eq(bookingRequestOffers.userAccepted, true),
                    eq(bookingRequestOffers.cookAccepted, true),
                ),
            ),
        serverRuntime.db
            .select()
            .from(bookingRequestParticipants)
            .where(inArray(bookingRequestParticipants.bookingRequestId, bookingRequestIds)),
        publicUsersByIdFindMany(serverRuntime.db, customerUserIds),
        promoCodeIds.length === 0
            ? Promise.resolve([])
            : serverRuntime.db
                  .select({
                      promoCodeId: promoCodes.promoCodeId,
                      minimumTotalAmountCustomerCents: promoCodes.minimumTotalAmountCustomerCents,
                  })
                  .from(promoCodes)
                  .where(inArray(promoCodes.promoCodeId, promoCodeIds)),
    ]);
    const publicUsers = publicUsersResult.byId;

    const promoMinById = new Map(promoRows.map((row) => [row.promoCodeId, row.minimumTotalAmountCustomerCents ?? null] as const));

    const acceptedByRequestId = new Map(siblingOffers.map((offer) => [offer.bookingRequestId, offer.bookingRequestOfferId]));
    const allOfferCounts = await serverRuntime.db
        .select({ bookingRequestId: bookingRequestOffers.bookingRequestId })
        .from(bookingRequestOffers)
        .where(inArray(bookingRequestOffers.bookingRequestId, bookingRequestIds));
    const totalOfferCountByRequestId = new Map<string, number>();
    for (const row of allOfferCounts) {
        totalOfferCountByRequestId.set(row.bookingRequestId, (totalOfferCountByRequestId.get(row.bookingRequestId) ?? 0) + 1);
    }

    const callBookingsByOfferId = new Map<string, typeof callBookingRows>();
    for (const row of callBookingRows) {
        const list = callBookingsByOfferId.get(row.bookingRequestOfferId) ?? [];
        list.push(row);
        callBookingsByOfferId.set(row.bookingRequestOfferId, list);
    }

    const menusByOfferId = new Map<string, typeof suggestedMenuRows>();
    for (const menu of suggestedMenuRows) {
        if (menu.bookingRequestOfferId == null) continue;
        const list = menusByOfferId.get(menu.bookingRequestOfferId) ?? [];
        list.push(menu);
        menusByOfferId.set(menu.bookingRequestOfferId, list);
    }

    const participantsByRequestId = new Map<string, typeof participantRows>();
    for (const participant of participantRows) {
        const list = participantsByRequestId.get(participant.bookingRequestId) ?? [];
        list.push(participant);
        participantsByRequestId.set(participant.bookingRequestId, list);
    }

    const result: GqlSCookBookingRequestOffer[] = [];
    for (const { offer, bookingRequest } of rows) {
        const acceptedOfferId = acceptedByRequestId.get(offer.bookingRequestId) ?? null;
        const acceptedOffer = siblingOffers.find((sibling) => sibling.bookingRequestOfferId === acceptedOfferId);
        const customer = publicUsers.get(bookingRequest.userId);
        if (!customer) {
            throw new Error(`cookBookingRequestOfferHydrate: customer user ${bookingRequest.userId} not found`);
        }
        const suggestedMenus = await cookMenusWithCourses(serverRuntime.db, menusByOfferId.get(offer.bookingRequestOfferId) ?? []);
        result.push(
            toGqlCookBookingRequestOffer({
                offer,
                bookingRequest,
                hasAcceptedAlternative: acceptedOfferId != null && acceptedOfferId !== offer.bookingRequestOfferId,
                locale: DEFAULT_LOCALE,
                callBookings: callBookingsByOfferId.get(offer.bookingRequestOfferId) ?? [],
                suggestedMenus,
                participants: participantsByRequestId.get(offer.bookingRequestId) ?? [],
                participantCount: (participantsByRequestId.get(offer.bookingRequestId) ?? []).length,
                bookingRequestContext: toGqlCookBookingRequestOfferContext({
                    bookingRequest,
                    participants: participantsByRequestId.get(offer.bookingRequestId) ?? [],
                    acceptedOfferPaymentStatus: acceptedOffer?.paymentStatus ?? null,
                    offerCount: totalOfferCountByRequestId.get(offer.bookingRequestId) ?? 0,
                    locale: DEFAULT_LOCALE,
                    user: customer,
                    estimatedTravelExpensesCents: offer.travelExpensesCents,
                    promoMinimumTotalAmountCustomerCents: bookingRequest.promoCodeId
                        ? (promoMinById.get(bookingRequest.promoCodeId) ?? null)
                        : null,
                    revealExactEventAddress: offer.userAccepted === true && offer.cookAccepted === true,
                }),
            }),
        );
    }
    return result;
}
