import { eq, sql } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests, cooks, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { slackNotifyPaymentFailed } from '../slack/slackNotifyBooking';
import { bookingRequestOfferPaymentPrepare } from '../utils/bookingRequestOfferPaymentPrepare';
import { bookingRequestOfferPaymentFailedSessionEventCreate } from '../utils/bookingRequestOfferPaymentSessionEventCreate';

/** Paid or already-setup: a later fail/cancel webhook must not downgrade the offer. */
const DO_NOT_MARK_FAILED = new Set(['PAYED', 'PAYED_OUT_OF_SYSTEM', 'TRANSFERRED', 'SETUP']);

type StripeIntentKind = 'paymentIntentId' | 'setupIntentId';

function stripeIntentCanceledEvent(detail?: string): boolean {
    return detail?.startsWith('setup_intent.canceled') === true || detail?.startsWith('payment_intent.canceled') === true;
}

/**
 * Webhook path: mark an offer FAILED when its PaymentIntent or SetupIntent
 * fails or is canceled. Idempotent for already-paid / already-setup / already-failed
 * rows. Canceled intents are replaced so checkout can retry.
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
            cook: cooks,
            customer: users,
        })
        .from(bookingRequestOffers)
        .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
        .innerJoin(cooks, eq(cooks.cookId, bookingRequestOffers.cookId))
        .innerJoin(users, eq(users.userId, bookingRequests.userId))
        .where(intentWhere)
        .limit(1);

    if (!row) {
        return false;
    }

    if (DO_NOT_MARK_FAILED.has(row.offer.paymentStatus)) {
        return true;
    }

    if (row.offer.paymentStatus === 'FAILED') {
        return true;
    }

    await serverRuntime.db.transaction(async (transaction) => {
        await transaction
            .update(bookingRequestOffers)
            .set({ paymentStatus: 'FAILED' })
            .where(eq(bookingRequestOffers.bookingRequestOfferId, row.offer.bookingRequestOfferId));

        await transaction.insert(bookingRequestOfferEvents).values({
            bookingRequestOfferEventId: idCreate(),
            bookingRequestOfferId: row.offer.bookingRequestOfferId,
            type: 'SYSTEM_PAYMENT_FAILED',
            payload: {
                source: 'WEBHOOK',
                ...(detail?.trim() ? { detail: detail.trim() } : {}),
            },
        });
    });

    if (stripeIntentCanceledEvent(detail) && row.customer.emailAddress && row.cook.stripeAccountId) {
        try {
            const paymentData = row.offer.paymentData;
            if (paymentData && 'paymentIntentId' in paymentData && paymentData.paymentIntentId) {
                await serverRuntime.stripe.paymentIntentCancel(paymentData.paymentIntentId);
            }
            if (paymentData && 'setupIntentId' in paymentData && paymentData.setupIntentId) {
                await serverRuntime.stripe.setupIntentCancel(paymentData.setupIntentId);
            }

            const prepared = await bookingRequestOfferPaymentPrepare(serverRuntime, {
                userId: row.customer.userId,
                emailAddress: row.customer.emailAddress,
                firstName: row.customer.firstName,
                lastName: row.customer.lastName,
                destinationAccountId: row.cook.stripeAccountId,
                totalCentsCustomer: row.offer.totalCentsCustomer ?? 0,
                payoutCentsCook: row.offer.payoutCentsCook,
                eventDateTime: row.bookingRequest.dateTime,
            });

            await serverRuntime.db
                .update(bookingRequestOffers)
                .set({
                    paymentData: prepared.paymentData,
                    plannedPaymentPullDateTime: prepared.plannedPaymentPullDateTime,
                    plannedPayoutDateTime: prepared.plannedPayoutDateTime,
                })
                .where(eq(bookingRequestOffers.bookingRequestOfferId, row.offer.bookingRequestOfferId));
        } catch (error) {
            serverRuntime.log.error(error, null);
        }
    }

    await Promise.all([
        serverRuntime.publish.userUpdates({ userId: row.bookingRequest.userId }),
        serverRuntime.publish.userUpdates({ userId: row.offer.cookId }),
        serverRuntime.publish.adminUpdates(),
    ]);

    await bookingRequestOfferPaymentFailedSessionEventCreate(serverRuntime, {
        customerUserId: row.bookingRequest.userId,
        bookingRequestId: row.bookingRequest.bookingRequestId,
        bookingRequestOfferId: row.offer.bookingRequestOfferId,
    });

    await slackNotifyPaymentFailed(serverRuntime, {
        bookingRequestId: row.bookingRequest.bookingRequestId,
        bookingRequestOfferId: row.offer.bookingRequestOfferId,
        detail,
    });

    return true;
}
