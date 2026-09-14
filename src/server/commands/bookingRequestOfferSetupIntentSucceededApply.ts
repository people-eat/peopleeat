import { eq, sql } from 'drizzle-orm';

import { bookingRequestOffers, bookingRequests, cooks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { bookingRequestOfferPaymentFinalize } from '../utils/bookingRequestOfferPaymentFinalize';

/**
 * Webhook / recovery path: find an offer whose paymentData references this
 * SetupIntent and finalize to SETUP (shared with the customer mutation).
 */
export async function bookingRequestOfferSetupIntentSucceededApply(setupIntentId: string, serverRuntime: ServerRuntime): Promise<boolean> {
    const [row] = await serverRuntime.db
        .select({
            offer: bookingRequestOffers,
            bookingRequest: bookingRequests,
            cook: cooks,
        })
        .from(bookingRequestOffers)
        .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
        .innerJoin(cooks, eq(cooks.cookId, bookingRequestOffers.cookId))
        .where(sql`${bookingRequestOffers.paymentData}->>'setupIntentId' = ${setupIntentId}`)
        .limit(1);

    if (!row || !row.cook.stripeAccountId) {
        return false;
    }

    if (
        row.offer.paymentStatus === 'SETUP' ||
        row.offer.paymentStatus === 'PAYED' ||
        row.offer.paymentStatus === 'PAYED_OUT_OF_SYSTEM' ||
        row.offer.paymentStatus === 'TRANSFERRED'
    ) {
        return true;
    }

    await bookingRequestOfferPaymentFinalize(serverRuntime, {
        offer: row.offer,
        bookingRequest: row.bookingRequest,
        customerUserId: row.bookingRequest.userId,
        cookStripeAccountId: row.cook.stripeAccountId,
    });

    await Promise.all([
        serverRuntime.publish.userUpdates({ userId: row.bookingRequest.userId }),
        serverRuntime.publish.userUpdates({ userId: row.offer.cookId }),
        serverRuntime.publish.adminUpdates(),
    ]);

    return true;
}
