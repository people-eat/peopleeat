import { and, desc, eq, isNotNull, isNull, ne, or, sql } from 'drizzle-orm';

import { bookingRequestCooks, bookingRequestOffers, bookingRequests } from '../db/schema';
import type { BookingRequest, BookingRequestCook, Cook } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { cookIsEligibleForBookingRequestPool } from './cookBookingRequestPoolEligibility';

export type CookBookingRequestPoolRow = {
    bookingRequest: BookingRequest;
    details: BookingRequestCook | null;
};

/**
 * Open-pool booking requests for one cook, newest first: not canceled / expired,
 * no own offer, no dual-accepted offer, and pool-eligible. Shared by the pool
 * list and `Cook.attentionCounts` so the badge always matches the list.
 */
export async function cookBookingRequestPoolRowsFind(
    cook: Cook,
    { onlyDeclined }: { onlyDeclined: boolean },
    serverRuntime: ServerRuntime,
): Promise<CookBookingRequestPoolRow[]> {
    const { cookId } = cook;
    const now = new Date();

    const rows = await serverRuntime.db
        .select({
            bookingRequest: bookingRequests,
            details: bookingRequestCooks,
            hasAcceptedOffer: sql<boolean>`EXISTS (
                SELECT 1 FROM ${bookingRequestOffers}
                WHERE ${bookingRequestOffers.bookingRequestId} = ${bookingRequests.bookingRequestId}
                  AND ${bookingRequestOffers.userAccepted} = true
                  AND ${bookingRequestOffers.cookAccepted} = true
            )`.as('hasAcceptedOffer'),
        })
        .from(bookingRequests)
        .leftJoin(
            bookingRequestOffers,
            and(eq(bookingRequestOffers.bookingRequestId, bookingRequests.bookingRequestId), eq(bookingRequestOffers.cookId, cookId)),
        )
        .leftJoin(
            bookingRequestCooks,
            and(eq(bookingRequestCooks.bookingRequestId, bookingRequests.bookingRequestId), eq(bookingRequestCooks.cookId, cookId)),
        )
        .where(
            and(
                ne(bookingRequests.userId, cookId),
                isNull(bookingRequests.canceledAt),
                or(isNull(bookingRequests.expiresAt), sql`${bookingRequests.expiresAt} >= ${now.toISOString()}`),
                isNull(bookingRequestOffers.bookingRequestOfferId),
                or(
                    eq(bookingRequests.publicationStatus, 'PUBLICATION_AUTO_APPROVED'),
                    and(eq(bookingRequests.publicationStatus, 'PUBLICATION_APPROVED_BY_ADMIN'), isNotNull(bookingRequestCooks.notifiedAt)),
                ),
                onlyDeclined ? isNotNull(bookingRequestCooks.declinedAt) : isNull(bookingRequestCooks.declinedAt),
            ),
        )
        .orderBy(desc(bookingRequests.createdAt));

    return rows
        .filter((row) => !row.hasAcceptedOffer && cookIsEligibleForBookingRequestPool(cook, row.bookingRequest, row.details))
        .map(({ bookingRequest, details }) => ({ bookingRequest, details }));
}
