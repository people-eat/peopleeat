import { asc, eq, inArray } from 'drizzle-orm';

import { bookingRequestOfferAddonLineAmountCents } from '../../shared/bookingRequestOfferAddonPrice';
import { bookingRequestPaidParticipants } from '../../shared/bookingRequestOfferPriceGuidance';
import { DEFAULT_LOCALE } from '../../shared/locale';
import type { BookingRequest } from '../db/schema';
import {
    bookingRequestOffers,
    bookingRequestParticipants,
    cookCallSlotBookings,
    cookOfferAddons,
    cooks,
    giftCards,
    menus,
    promoCodes,
    users,
} from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminBookingRequest } from '../graphql/generated';
import { toGqlAdminBookingRequest } from '../mappers/toGqlAdminBookingRequest';
import { toGqlAdminBookingRequestOffer } from '../mappers/toGqlAdminBookingRequestOffer';
import { toGqlAdminCook } from '../mappers/toGqlAdminCook';
import { toGqlAdminUser } from '../mappers/toGqlAdminUser';
import { toGqlCookOfferAddon } from '../mappers/toGqlCookOfferAddon';
import { adminUserTypesByUserIdFindMany } from './adminUserTypesByUserIdFindMany';
import { bookingRequestKitchenDetailsPhotosByRequestIdFind } from './bookingRequestKitchenDetailsPhotosHydrate';
import { bookingRequestOfferCookPayoutReadinessResolve } from './bookingRequestOfferCookPayoutReadinessResolve';
import { cookMenusWithCourses } from './cookMenuHydrate';

/** Batch-load nested admin booking-request fields (customer, offers, cooks, menus, discounts). */
export async function adminBookingRequestHydrate(rows: BookingRequest[], serverRuntime: ServerRuntime): Promise<GqlSAdminBookingRequest[]> {
    if (rows.length === 0) return [];

    const bookingRequestIds = rows.map((row) => row.bookingRequestId);
    const customerIds = [...new Set(rows.map((row) => row.userId))];
    const promoCodeIds = [...new Set(rows.map((row) => row.promoCodeId).filter((id): id is string => id != null))];
    const giftCardIds = [...new Set(rows.map((row) => row.giftCardId).filter((id): id is string => id != null))];

    const [participants, offers, customerRows, typesByUserId, promoCodeRows, giftCardRows, kitchenDetailsPhotosByRequestId] =
        await Promise.all([
            serverRuntime.db
                .select()
                .from(bookingRequestParticipants)
                .where(inArray(bookingRequestParticipants.bookingRequestId, bookingRequestIds)),
            serverRuntime.db.select().from(bookingRequestOffers).where(inArray(bookingRequestOffers.bookingRequestId, bookingRequestIds)),
            serverRuntime.db.select().from(users).where(inArray(users.userId, customerIds)),
            adminUserTypesByUserIdFindMany(customerIds, serverRuntime.db),
            promoCodeIds.length === 0
                ? Promise.resolve([])
                : serverRuntime.db.select().from(promoCodes).where(inArray(promoCodes.promoCodeId, promoCodeIds)),
            giftCardIds.length === 0
                ? Promise.resolve([])
                : serverRuntime.db.select().from(giftCards).where(inArray(giftCards.giftCardId, giftCardIds)),
            bookingRequestKitchenDetailsPhotosByRequestIdFind(serverRuntime, bookingRequestIds),
        ]);

    const promoById = new Map(promoCodeRows.map((row) => [row.promoCodeId, row]));
    const giftById = new Map(giftCardRows.map((row) => [row.giftCardId, row]));
    const promoMinById = new Map(promoCodeRows.map((row) => [row.promoCodeId, row.minimumTotalAmountCustomerCents ?? null] as const));

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

    const customersById = new Map(
        customerRows.map((row) => [row.userId, toGqlAdminUser(row, typesByUserId.get(row.userId) ?? ['customer'])]),
    );

    const cookIds = [...new Set(offers.map((offer) => offer.cookId))];
    const cookRows =
        cookIds.length === 0
            ? []
            : await serverRuntime.db
                  .select({ cook: cooks, status: users.status })
                  .from(cooks)
                  .innerJoin(users, eq(users.userId, cooks.cookId))
                  .where(inArray(cooks.cookId, cookIds));
    const cooksById = new Map(cookRows.map((row) => [row.cook.cookId, toGqlAdminCook(row.cook, row.status)]));

    const readinessByCookId = new Map<string, Awaited<ReturnType<typeof bookingRequestOfferCookPayoutReadinessResolve>>>();
    await Promise.all(
        cookRows.map(async ({ cook }) => {
            readinessByCookId.set(cook.cookId, await bookingRequestOfferCookPayoutReadinessResolve(cook, serverRuntime.stripe));
        }),
    );

    const offerIds = offers.map((offer) => offer.bookingRequestOfferId);
    const [callBookingRows, suggestedMenuRows, offerAddonRows] = await Promise.all([
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
        offerIds.length === 0
            ? Promise.resolve([])
            : serverRuntime.db.select().from(cookOfferAddons).where(inArray(cookOfferAddons.bookingRequestOfferId, offerIds)),
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

    const addonsByOfferId = new Map<string, typeof offerAddonRows>();
    for (const addon of offerAddonRows) {
        if (addon.bookingRequestOfferId == null) continue;
        const list = addonsByOfferId.get(addon.bookingRequestOfferId) ?? [];
        list.push(addon);
        addonsByOfferId.set(addon.bookingRequestOfferId, list);
    }

    const result: GqlSAdminBookingRequest[] = [];
    for (const bookingRequest of rows) {
        const customer = customersById.get(bookingRequest.userId);
        if (!customer) continue;

        const requestOffers = offersByRequest.get(bookingRequest.bookingRequestId) ?? [];
        const accepted = requestOffers.find((offer) => offer.userAccepted === true && offer.cookAccepted === true);
        const requestParticipants = participantsByRequest.get(bookingRequest.bookingRequestId) ?? [];
        const paidParticipants = bookingRequestPaidParticipants(
            requestParticipants.filter((participant) => participant.type === 'ADULT').length,
            requestParticipants.filter((participant) => participant.type === 'DISCOUNTED').length,
        );
        const promoCode = bookingRequest.promoCodeId ? (promoById.get(bookingRequest.promoCodeId) ?? null) : null;
        const giftCard = bookingRequest.giftCardId ? (giftById.get(bookingRequest.giftCardId) ?? null) : null;
        const gqlOffers = [];
        for (const offer of requestOffers) {
            const cook = cooksById.get(offer.cookId);
            if (!cook) continue;
            const readiness = readinessByCookId.get(offer.cookId) ?? {
                cookPayoutReady: false,
                cookPayoutBlockedReason: 'MISSING_STRIPE_ACCOUNT' as const,
            };
            const suggestedMenus = await cookMenusWithCourses(serverRuntime.db, menusByOfferId.get(offer.bookingRequestOfferId) ?? []);
            const offerAddons = addonsByOfferId.get(offer.bookingRequestOfferId) ?? [];
            const selectedAddonCostLines = offerAddons
                .filter((addon) => addon.customerSelected)
                .map((addon) => ({
                    title: addon.title,
                    amountCents: bookingRequestOfferAddonLineAmountCents({
                        pricingUnit: addon.pricingUnit,
                        priceCents: addon.priceCents,
                        paidParticipants,
                    }),
                }));
            gqlOffers.push(
                toGqlAdminBookingRequestOffer({
                    offer,
                    bookingRequest,
                    hasAcceptedAlternative: accepted != null && accepted.bookingRequestOfferId !== offer.bookingRequestOfferId,
                    locale: DEFAULT_LOCALE,
                    cook,
                    callBookings: callBookingsByOfferId.get(offer.bookingRequestOfferId) ?? [],
                    suggestedMenus,
                    addons: offerAddons.map(toGqlCookOfferAddon),
                    selectedAddonCostLines,
                    cookPayoutReady: readiness.cookPayoutReady,
                    cookPayoutBlockedReason: readiness.cookPayoutBlockedReason,
                    promoCode,
                    giftCard,
                    participantCount: requestParticipants.length,
                    participants: requestParticipants,
                }),
            );
        }

        result.push(
            toGqlAdminBookingRequest({
                bookingRequest,
                participants: requestParticipants,
                offers: gqlOffers,
                acceptedOfferPaymentStatus: accepted?.paymentStatus ?? null,
                locale: DEFAULT_LOCALE,
                customer,
                cook: accepted ? (cooksById.get(accepted.cookId) ?? null) : null,
                promoCode,
                giftCard,
                promoMinimumTotalAmountCustomerCents: bookingRequest.promoCodeId
                    ? (promoMinById.get(bookingRequest.promoCodeId) ?? null)
                    : null,
                kitchenDetailsPhotos: kitchenDetailsPhotosByRequestId.get(bookingRequest.bookingRequestId) ?? [],
            }),
        );
    }
    return result;
}
