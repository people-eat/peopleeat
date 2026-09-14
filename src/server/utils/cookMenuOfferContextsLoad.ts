import { and, eq, inArray } from 'drizzle-orm';

import type { Database } from '../db';
import { bookingRequestOffers, bookingRequests, users } from '../db/schema';
import { bookingRequestOfferStatusDerive } from '../domain/bookingRequest';
import type { GqlSCookMenuOfferContext } from '../graphql/generated';

/**
 * Batch-load offer context for offer-scoped menus keyed by bookingRequestOfferId.
 * Uses hasAcceptedAlternative so status matches the cook offer inbox.
 */
export async function cookMenuOfferContextsLoad(db: Database, offerIds: readonly string[]): Promise<Map<string, GqlSCookMenuOfferContext>> {
    const uniqueOfferIds = [...new Set(offerIds.filter((id) => id.length > 0))];
    if (uniqueOfferIds.length === 0) return new Map();

    const offerRows = await db
        .select({
            bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId,
            bookingRequestId: bookingRequestOffers.bookingRequestId,
            userAccepted: bookingRequestOffers.userAccepted,
            cookAccepted: bookingRequestOffers.cookAccepted,
            userRequestedMenuAdjustments: bookingRequestOffers.userRequestedMenuAdjustments,
            paymentStatus: bookingRequestOffers.paymentStatus,
            paymentData: bookingRequestOffers.paymentData,
            dateTime: bookingRequests.dateTime,
            expiresAt: bookingRequests.expiresAt,
            canceledAt: bookingRequests.canceledAt,
            customerFirstName: users.firstName,
        })
        .from(bookingRequestOffers)
        .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
        .innerJoin(users, eq(users.userId, bookingRequests.userId))
        .where(inArray(bookingRequestOffers.bookingRequestOfferId, uniqueOfferIds));

    const bookingRequestIds = [...new Set(offerRows.map((row) => row.bookingRequestId))];
    const acceptedSiblings =
        bookingRequestIds.length === 0
            ? []
            : await db
                  .select({
                      bookingRequestId: bookingRequestOffers.bookingRequestId,
                      bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId,
                  })
                  .from(bookingRequestOffers)
                  .where(
                      and(
                          inArray(bookingRequestOffers.bookingRequestId, bookingRequestIds),
                          eq(bookingRequestOffers.userAccepted, true),
                          eq(bookingRequestOffers.cookAccepted, true),
                      ),
                  );

    const acceptedByRequestId = new Map(acceptedSiblings.map((row) => [row.bookingRequestId, row.bookingRequestOfferId]));

    const contexts = new Map<string, GqlSCookMenuOfferContext>();
    for (const row of offerRows) {
        const acceptedOfferId = acceptedByRequestId.get(row.bookingRequestId) ?? null;
        const status = bookingRequestOfferStatusDerive({
            userAccepted: row.userAccepted ?? null,
            cookAccepted: row.cookAccepted ?? null,
            userRequestedMenuAdjustments: row.userRequestedMenuAdjustments ?? null,
            paymentStatus: row.paymentStatus,
            paymentDataPresent: Boolean(row.paymentData),
            bookingRequestCanceledAt: row.canceledAt,
            bookingRequestExpiresAt: row.expiresAt,
            bookingRequestDateTime: row.dateTime,
            hasAcceptedAlternative: acceptedOfferId != null && acceptedOfferId !== row.bookingRequestOfferId,
        });

        contexts.set(row.bookingRequestOfferId, {
            bookingRequestOfferId: row.bookingRequestOfferId,
            bookingRequestDateTime: row.dateTime,
            customerFirstName: row.customerFirstName,
            status,
        });
    }

    return contexts;
}
