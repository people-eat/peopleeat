import { and, eq, isNull, or, sql } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests } from '../db/schema';
import { bookingRequestCancelableStatuses, bookingRequestStatusDerive } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { bookingRequestCancelApply } from './bookingRequestCancelApply';
import { bookingRequestOfferNegotiationAssert } from './bookingRequestOfferNegotiationAssert';
import {
    bookingRequestOfferPendingCallSlotsClose,
    bookingRequestOfferPendingCallSlotsCompleteJobsCancel,
} from './bookingRequestOfferPendingCallSlotsClose';

export const USER_MARKETPLACE_CLEANUP_REASON_ANONYMIZE = 'Konto wurde gelöscht';
export const USER_MARKETPLACE_CLEANUP_REASON_BAN = 'Nutzer wurde gesperrt';

export type UserMarketplaceOpenCleanupResult = {
    canceledBookingRequestIds: string[];
    declinedOfferIds: string[];
    affectedCounterpartUserIds: string[];
};

/**
 * Cancels cancelable booking requests owned by the user and declines open
 * (non dual-accepted) offers where the user is the cook. Used before
 * anonymize scrub and on ban. See docs/features/account.md.
 */
export async function userMarketplaceOpenCleanup(
    userId: string,
    reason: string,
    serverRuntime: ServerRuntime,
): Promise<UserMarketplaceOpenCleanupResult> {
    const canceledBookingRequestIds: string[] = [];
    const declinedOfferIds: string[] = [];
    const affectedCounterpartUserIds = new Set<string>();
    const now = new Date();

    const ownedRequests = await serverRuntime.db.select().from(bookingRequests).where(eq(bookingRequests.userId, userId));

    for (const bookingRequest of ownedRequests) {
        if (bookingRequest.canceledAt != null) {
            continue;
        }
        const offers = await serverRuntime.db
            .select()
            .from(bookingRequestOffers)
            .where(eq(bookingRequestOffers.bookingRequestId, bookingRequest.bookingRequestId));
        const accepted = offers.find((offer) => offer.userAccepted === true && offer.cookAccepted === true);
        const status = bookingRequestStatusDerive({
            offerCount: offers.length,
            acceptedOfferPaymentStatus: accepted?.paymentStatus ?? null,
            canceledAt: bookingRequest.canceledAt,
            expiresAt: bookingRequest.expiresAt,
            eventDate: bookingRequest.dateTime,
        });
        if (!bookingRequestCancelableStatuses.has(status)) {
            continue;
        }
        const result = await bookingRequestCancelApply(serverRuntime, { bookingRequest, offers, reason });
        canceledBookingRequestIds.push(result.bookingRequestId);
        for (const cookId of result.cookIds) {
            affectedCounterpartUserIds.add(cookId);
        }
    }

    const openCookOffers = await serverRuntime.db
        .select({ offer: bookingRequestOffers, bookingRequest: bookingRequests })
        .from(bookingRequestOffers)
        .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
        .where(
            and(
                eq(bookingRequestOffers.cookId, userId),
                or(isNull(bookingRequestOffers.cookAccepted), eq(bookingRequestOffers.cookAccepted, true)),
                or(isNull(bookingRequestOffers.userAccepted), eq(bookingRequestOffers.userAccepted, true)),
                sql`NOT (${bookingRequestOffers.cookAccepted} IS TRUE AND ${bookingRequestOffers.userAccepted} IS TRUE)`,
            ),
        );

    const closedCallSlotBookingIds: string[] = [];

    for (const row of openCookOffers) {
        bookingRequestOfferNegotiationAssert(row.offer);

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction
                .update(bookingRequestOffers)
                .set({
                    cookAccepted: false,
                    cookDeclinationReason: reason,
                    userUnreadNotificationCount: row.offer.userUnreadNotificationCount + 1,
                })
                .where(eq(bookingRequestOffers.bookingRequestOfferId, row.offer.bookingRequestOfferId));

            await transaction.insert(bookingRequestOfferEvents).values({
                bookingRequestOfferEventId: idCreate(),
                bookingRequestOfferId: row.offer.bookingRequestOfferId,
                type: 'COOK_DECLINED',
                payload: {},
            });

            const slotIds = await bookingRequestOfferPendingCallSlotsClose(transaction, {
                bookingRequestOfferIds: [row.offer.bookingRequestOfferId],
                reason: { kind: 'OFFER_DECLINED', declinedBy: 'COOK' },
                now,
            });
            closedCallSlotBookingIds.push(...slotIds);
        });

        declinedOfferIds.push(row.offer.bookingRequestOfferId);
        affectedCounterpartUserIds.add(row.bookingRequest.userId);
    }

    await bookingRequestOfferPendingCallSlotsCompleteJobsCancel(serverRuntime, closedCallSlotBookingIds);

    affectedCounterpartUserIds.delete(userId);

    return {
        canceledBookingRequestIds,
        declinedOfferIds,
        affectedCounterpartUserIds: [...affectedCounterpartUserIds],
    };
}
