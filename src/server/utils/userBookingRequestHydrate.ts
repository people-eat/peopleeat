import { asc, inArray } from 'drizzle-orm';

import type { BookingRequest } from '../db/schema';
import { bookingRequestOffers, bookingRequestParticipants, cookCallSlotBookings, giftCards, menus, promoCodes } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSUserBookingRequest } from '../graphql/generated';
import { toGqlUserBookingRequest } from '../mappers/toGqlUserBookingRequest';
import { toGqlUserBookingRequestOffer } from '../mappers/toGqlUserBookingRequestOffer';
import { publicCookMenusWithCourses } from './cookMenuHydrate';
import { publicCooksByIdFindMany } from './publicCookHydrate';

/** Batch-load nested user booking-request fields (participants, offers, call bookings, cooks, menus, discounts). */
export async function userBookingRequestHydrate(rows: BookingRequest[], serverRuntime: ServerRuntime): Promise<GqlSUserBookingRequest[]> {
    if (rows.length === 0) return [];

    const bookingRequestIds = rows.map((row) => row.bookingRequestId);
    const promoCodeIds = [...new Set(rows.map((row) => row.promoCodeId).filter((id): id is string => id != null))];
    const giftCardIds = [...new Set(rows.map((row) => row.giftCardId).filter((id): id is string => id != null))];

    const [participants, offers, promoCodeRows, giftCardRows] = await Promise.all([
        serverRuntime.db
            .select()
            .from(bookingRequestParticipants)
            .where(inArray(bookingRequestParticipants.bookingRequestId, bookingRequestIds)),
        serverRuntime.db.select().from(bookingRequestOffers).where(inArray(bookingRequestOffers.bookingRequestId, bookingRequestIds)),
        promoCodeIds.length === 0
            ? Promise.resolve([])
            : serverRuntime.db.select().from(promoCodes).where(inArray(promoCodes.promoCodeId, promoCodeIds)),
        giftCardIds.length === 0
            ? Promise.resolve([])
            : serverRuntime.db.select().from(giftCards).where(inArray(giftCards.giftCardId, giftCardIds)),
    ]);

    const promoById = new Map(promoCodeRows.map((row) => [row.promoCodeId, row]));
    const giftById = new Map(giftCardRows.map((row) => [row.giftCardId, row]));

    const participantsByRequest = new Map<string, typeof participants>();
    for (const participant of participants) {
        const list = participantsByRequest.get(participant.bookingRequestId) ?? [];
        list.push(participant);
        participantsByRequest.set(participant.bookingRequestId, list);
    }

    const offersByRequest = new Map<string, typeof offers>();
    for (const offer of offers) {
        const list = offersByRequest.get(offer.bookingRequestId) ?? [];
        list.push(offer);
        offersByRequest.set(offer.bookingRequestId, list);
    }

    const cookIds = [...new Set(offers.map((offer) => offer.cookId))];
    const cooksById = await publicCooksByIdFindMany(serverRuntime.db, cookIds);

    const offerIds = offers.map((offer) => offer.bookingRequestOfferId);
    const [callBookingRows, suggestedMenuRows] = await Promise.all([
        offerIds.length === 0
            ? Promise.resolve([])
            : serverRuntime.db
                  .select()
                  .from(cookCallSlotBookings)
                  .where(inArray(cookCallSlotBookings.bookingRequestOfferId, offerIds))
                  .orderBy(asc(cookCallSlotBookings.startAt)),
        offerIds.length === 0
            ? Promise.resolve([])
            : serverRuntime.db.select().from(menus).where(inArray(menus.bookingRequestOfferId, offerIds)),
    ]);

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

    const result: GqlSUserBookingRequest[] = [];
    for (const bookingRequest of rows) {
        const requestOffers = offersByRequest.get(bookingRequest.bookingRequestId) ?? [];
        const accepted = requestOffers.find((offer) => offer.userAccepted === true && offer.cookAccepted === true);
        const requestParticipants = participantsByRequest.get(bookingRequest.bookingRequestId) ?? [];
        const promoCode = bookingRequest.promoCodeId ? (promoById.get(bookingRequest.promoCodeId) ?? null) : null;
        const giftCard = bookingRequest.giftCardId ? (giftById.get(bookingRequest.giftCardId) ?? null) : null;
        const gqlOffers = [];
        for (const offer of requestOffers) {
            const cook = cooksById.get(offer.cookId);
            if (!cook) continue;
            const suggestedMenus = await publicCookMenusWithCourses(
                serverRuntime.db,
                menusByOfferId.get(offer.bookingRequestOfferId) ?? [],
            );
            gqlOffers.push(
                toGqlUserBookingRequestOffer({
                    offer,
                    bookingRequest,
                    hasAcceptedAlternative: accepted != null && accepted.bookingRequestOfferId !== offer.bookingRequestOfferId,
                    locale: 'de',
                    cook,
                    suggestedMenus,
                    callBookings: callBookingsByOfferId.get(offer.bookingRequestOfferId) ?? [],
                    promoCode,
                    giftCard,
                    participantCount: requestParticipants.length,
                    participants: requestParticipants,
                }),
            );
        }
        result.push(
            toGqlUserBookingRequest({
                bookingRequest,
                participants: requestParticipants,
                offers: gqlOffers,
                acceptedOfferPaymentStatus: accepted?.paymentStatus ?? null,
                promoCode,
                giftCard,
                locale: 'de',
            }),
        );
    }
    return result;
}
