import { and, asc, eq, inArray } from 'drizzle-orm';

import { DEFAULT_LOCALE } from '../../shared/locale';
import {
    bookingRequestOffers,
    bookingRequestParticipants,
    cookCallSlotBookings,
    cooks,
    giftCards,
    menus,
    promoCodes,
    users,
} from '../db/schema';
import type { BookingRequest, BookingRequestOffer } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminBookingRequestOffer } from '../graphql/generated';
import { toGqlAdminBookingRequestOffer } from '../mappers/toGqlAdminBookingRequestOffer';
import { toGqlAdminCook } from '../mappers/toGqlAdminCook';
import { bookingRequestOfferCookPayoutReadinessResolve } from './bookingRequestOfferCookPayoutReadinessResolve';
import { cookMenusWithCourses } from './cookMenuHydrate';

type AdminBookingRequestOfferRow = {
    offer: BookingRequestOffer;
    bookingRequest: BookingRequest;
};

/** Batch-load nested admin offer fields (cook, call bookings, suggested menus, accept flags, discounts). */
export async function adminBookingRequestOfferHydrate(
    rows: AdminBookingRequestOfferRow[],
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminBookingRequestOffer[]> {
    if (rows.length === 0) return [];

    const cookIds = [...new Set(rows.map((row) => row.offer.cookId))];
    const bookingRequestIds = [...new Set(rows.map((row) => row.offer.bookingRequestId))];
    const promoCodeIds = [...new Set(rows.map((row) => row.bookingRequest.promoCodeId).filter((id): id is string => id != null))];
    const giftCardIds = [...new Set(rows.map((row) => row.bookingRequest.giftCardId).filter((id): id is string => id != null))];

    const cookRows = await serverRuntime.db
        .select({ cook: cooks, status: users.status })
        .from(cooks)
        .innerJoin(users, eq(users.userId, cooks.cookId))
        .where(inArray(cooks.cookId, cookIds));
    const cooksById = new Map(cookRows.map((row) => [row.cook.cookId, row]));

    const readinessByCookId = new Map<string, Awaited<ReturnType<typeof bookingRequestOfferCookPayoutReadinessResolve>>>();
    await Promise.all(
        cookRows.map(async ({ cook }) => {
            readinessByCookId.set(cook.cookId, await bookingRequestOfferCookPayoutReadinessResolve(cook, serverRuntime.stripe));
        }),
    );

    const offerIds = rows.map((row) => row.offer.bookingRequestOfferId);
    const [callBookingRows, suggestedMenuRows, siblingOffers, participantRows, promoCodeRows, giftCardRows] = await Promise.all([
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
        promoCodeIds.length === 0
            ? Promise.resolve([])
            : serverRuntime.db.select().from(promoCodes).where(inArray(promoCodes.promoCodeId, promoCodeIds)),
        giftCardIds.length === 0
            ? Promise.resolve([])
            : serverRuntime.db.select().from(giftCards).where(inArray(giftCards.giftCardId, giftCardIds)),
    ]);

    const promoById = new Map(promoCodeRows.map((row) => [row.promoCodeId, row]));
    const giftById = new Map(giftCardRows.map((row) => [row.giftCardId, row]));
    const acceptedByRequestId = new Map(siblingOffers.map((offer) => [offer.bookingRequestId, offer.bookingRequestOfferId]));

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

    const result: GqlSAdminBookingRequestOffer[] = [];
    for (const { offer, bookingRequest } of rows) {
        const cookMatched = cooksById.get(offer.cookId);
        if (!cookMatched) continue;

        const readiness = readinessByCookId.get(offer.cookId) ?? {
            cookPayoutReady: false,
            cookPayoutBlockedReason: 'MISSING_STRIPE_ACCOUNT' as const,
        };

        const acceptedOfferId = acceptedByRequestId.get(offer.bookingRequestId) ?? null;
        const suggestedMenus = await cookMenusWithCourses(serverRuntime.db, menusByOfferId.get(offer.bookingRequestOfferId) ?? []);
        const promoCode = bookingRequest.promoCodeId ? (promoById.get(bookingRequest.promoCodeId) ?? null) : null;
        const giftCard = bookingRequest.giftCardId ? (giftById.get(bookingRequest.giftCardId) ?? null) : null;
        const requestParticipants = participantsByRequestId.get(offer.bookingRequestId) ?? [];
        result.push(
            toGqlAdminBookingRequestOffer({
                offer,
                bookingRequest,
                hasAcceptedAlternative: acceptedOfferId != null && acceptedOfferId !== offer.bookingRequestOfferId,
                locale: DEFAULT_LOCALE,
                cook: toGqlAdminCook(cookMatched.cook, cookMatched.status),
                callBookings: callBookingsByOfferId.get(offer.bookingRequestOfferId) ?? [],
                suggestedMenus,
                cookPayoutReady: readiness.cookPayoutReady,
                cookPayoutBlockedReason: readiness.cookPayoutBlockedReason,
                promoCode,
                giftCard,
                participantCount: requestParticipants.length,
            }),
        );
    }
    return result;
}
