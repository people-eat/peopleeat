import { eq, or, sql } from 'drizzle-orm';

import { bookingRequestOffers, bookingRequests, cooks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { bookingRequestOfferHasPendingDeltaPayment } from '../utils/bookingRequestOfferParticipantAmendmentGates';
import { bookingRequestOfferPaymentFinalize } from '../utils/bookingRequestOfferPaymentFinalize';

/**
 * Webhook / recovery path: find an offer whose paymentData references this
 * PaymentIntent (primary or pending delta) and finalize to PAYED / clear pending delta.
 */
export async function bookingRequestOfferPaymentIntentSucceededApply(
    paymentIntentId: string,
    serverRuntime: ServerRuntime,
): Promise<boolean> {
    const [row] = await serverRuntime.db
        .select({
            offer: bookingRequestOffers,
            bookingRequest: bookingRequests,
            cook: cooks,
        })
        .from(bookingRequestOffers)
        .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
        .innerJoin(cooks, eq(cooks.cookId, bookingRequestOffers.cookId))
        .where(
            or(
                sql`${bookingRequestOffers.paymentData}->>'paymentIntentId' = ${paymentIntentId}`,
                sql`${bookingRequestOffers.paymentData}->'pendingDeltaPayment'->>'paymentIntentId' = ${paymentIntentId}`,
            ),
        )
        .limit(1);

    if (!row || !row.cook.stripeAccountId) {
        return false;
    }

    const pendingDelta =
        row.offer.paymentData && 'pendingDeltaPayment' in row.offer.paymentData ? row.offer.paymentData.pendingDeltaPayment : undefined;
    const isPendingDeltaSuccess = pendingDelta?.paymentIntentId === paymentIntentId;

    if (
        row.offer.paymentStatus === 'PAYED' ||
        row.offer.paymentStatus === 'PAYED_OUT_OF_SYSTEM' ||
        row.offer.paymentStatus === 'TRANSFERRED'
    ) {
        if (!(isPendingDeltaSuccess && bookingRequestOfferHasPendingDeltaPayment(row.offer.paymentData))) {
            return true;
        }
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
