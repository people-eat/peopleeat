import { eq, sql } from 'drizzle-orm';

import { bookingRequestOffers, bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { slackNotifyPaymentFailed } from '../slack/slackNotifyBooking';

const TERMINAL_PAID = new Set(['PAYED', 'PAYED_OUT_OF_SYSTEM', 'TRANSFERRED']);

type StripeIntentKind = 'paymentIntentId' | 'setupIntentId';

/**
 * Webhook path: mark an offer FAILED when its PaymentIntent or SetupIntent
 * fails or is canceled. Idempotent for already-paid / already-failed rows.
 */
export async function bookingRequestOfferPaymentFailedApply(
    intentId: string,
    intentKind: StripeIntentKind,
    serverRuntime: ServerRuntime,
    detail?: string,
): Promise<boolean> {
    const intentWhere =
        intentKind === 'paymentIntentId'
            ? sql`${bookingRequestOffers.paymentData}->>'paymentIntentId' = ${intentId}`
            : sql`${bookingRequestOffers.paymentData}->>'setupIntentId' = ${intentId}`;
    const [row] = await serverRuntime.db
        .select({
            offer: bookingRequestOffers,
            bookingRequest: bookingRequests,
        })
        .from(bookingRequestOffers)
        .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
        .where(intentWhere)
        .limit(1);

    if (!row) {
        return false;
    }

    if (TERMINAL_PAID.has(row.offer.paymentStatus)) {
        return true;
    }

    if (row.offer.paymentStatus === 'FAILED') {
        return true;
    }

    await serverRuntime.db
        .update(bookingRequestOffers)
        .set({ paymentStatus: 'FAILED' })
        .where(eq(bookingRequestOffers.bookingRequestOfferId, row.offer.bookingRequestOfferId));

    await Promise.all([
        serverRuntime.publish.userUpdates({ userId: row.bookingRequest.userId }),
        serverRuntime.publish.userUpdates({ userId: row.offer.cookId }),
        serverRuntime.publish.adminUpdates(),
    ]);

    await slackNotifyPaymentFailed(serverRuntime, {
        bookingRequestId: row.bookingRequest.bookingRequestId,
        bookingRequestOfferId: row.offer.bookingRequestOfferId,
        detail,
    });

    return true;
}
