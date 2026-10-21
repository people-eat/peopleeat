import { eq } from 'drizzle-orm';

import { bookingRequestOffers, bookingRequests } from '../db/schema';
import type { BookingRequest, BookingRequestOffer } from '../db/schema';
import type {
    BookingRequestInvoiceAddress,
    BookingRequestOfferPaymentData,
    BookingRequestOfferPaymentStatus,
} from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { bookingRequestOfferPullPayment } from '../jobs/handlers/bookingRequestOfferPullPayment';
import { bookingRequestOfferPullPaymentAnnouncement } from '../jobs/handlers/bookingRequestOfferPullPaymentAnnouncement';
import { bookingRequestOfferPaymentConfirmedEmailSend } from './bookingRequestLifecycleEmails';
import { bookingRequestOfferExtraTransferMaybeCreate } from './bookingRequestOfferExtraTransferMaybeCreate';
import {
    bookingRequestOfferPullAnnouncementDueDate,
    bookingRequestOfferPullPaymentDueDate,
    bookingRequestOfferShouldAnnouncePull,
} from './bookingRequestOfferPaymentPrepare';
import { bookingRequestOfferPaymentSucceededSessionEventCreate } from './bookingRequestOfferPaymentSessionEventCreate';

async function paymentDataWithTransferId(
    serverRuntime: Pick<ServerRuntime, 'stripe'>,
    paymentData: BookingRequestOfferPaymentData,
): Promise<BookingRequestOfferPaymentData> {
    if (!('paymentIntentId' in paymentData) || !paymentData.paymentIntentId) {
        return paymentData;
    }
    const transferId = await serverRuntime.stripe.paymentIntentDestinationTransferIdFindOne(paymentData.paymentIntentId);
    if (!transferId) return paymentData;
    return { ...paymentData, transferId };
}

export type BookingRequestOfferPaymentFinalizeInput = {
    offer: BookingRequestOffer;
    bookingRequest: BookingRequest;
    customerUserId: string;
    cookStripeAccountId: string;
    invoiceAddress?: BookingRequestInvoiceAddress | null;
    /** Prefer GraphQL requesting session when available. */
    sessionId?: string | null;
};

/**
 * Verifies Stripe SI/PI success for a dual-accepted offer, advances
 * `paymentStatus`, optionally stores invoice address, and enqueues pull jobs
 * for SetupIntent flows. Idempotent when already SETUP / PAYED.
 */
export async function bookingRequestOfferPaymentFinalize(
    serverRuntime: ServerRuntime,
    input: BookingRequestOfferPaymentFinalizeInput,
): Promise<{ advanced: boolean }> {
    const { offer, bookingRequest, customerUserId, cookStripeAccountId, invoiceAddress, sessionId } = input;

    if (!(offer.userAccepted === true && offer.cookAccepted === true) || !offer.paymentData) {
        throw new Error('bookingRequestOfferPaymentFinalize: offer not dual-accepted or missing paymentData');
    }

    const pendingDelta = 'pendingDeltaPayment' in offer.paymentData ? offer.paymentData.pendingDeltaPayment : undefined;

    if (offer.paymentStatus === 'PAYED' && pendingDelta) {
        const succeeded = await serverRuntime.stripe.paymentIntentSucceededCheck(pendingDelta.paymentIntentId);
        if (!succeeded) {
            throw new Error('bookingRequestOfferPaymentFinalize: pending delta payment intent not succeeded');
        }
        const cookPayoutForSplit = Math.max(0, offer.payoutCentsCook);
        const extraTransferId = await bookingRequestOfferExtraTransferMaybeCreate(serverRuntime, {
            destinationAccountId: cookStripeAccountId,
            userId: customerUserId,
            totalCentsCustomer: pendingDelta.amountCents,
            payoutCentsCook: Math.min(cookPayoutForSplit, pendingDelta.amountCents),
        });
        const clearedPending: BookingRequestOfferPaymentData = {
            ...offer.paymentData,
            pendingDeltaPayment: undefined,
            clientSecret:
                'clientSecret' in offer.paymentData && offer.paymentData.clientSecret !== pendingDelta.clientSecret
                    ? offer.paymentData.clientSecret
                    : undefined,
            ...(extraTransferId ? { extraTransferId } : {}),
        } as BookingRequestOfferPaymentData;
        // Drop undefined pendingDeltaPayment key for cleaner JSON.
        if ('pendingDeltaPayment' in clearedPending) {
            delete (clearedPending as { pendingDeltaPayment?: unknown }).pendingDeltaPayment;
        }

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction
                .update(bookingRequestOffers)
                .set({ paymentData: clearedPending })
                .where(eq(bookingRequestOffers.bookingRequestOfferId, offer.bookingRequestOfferId));
            if (invoiceAddress) {
                await transaction
                    .update(bookingRequests)
                    .set({ invoiceAddress })
                    .where(eq(bookingRequests.bookingRequestId, bookingRequest.bookingRequestId));
            }
        });
        return { advanced: true };
    }

    if (offer.paymentStatus === 'PAYED' || offer.paymentStatus === 'PAYED_OUT_OF_SYSTEM' || offer.paymentStatus === 'TRANSFERRED') {
        if (invoiceAddress) {
            await serverRuntime.db
                .update(bookingRequests)
                .set({ invoiceAddress })
                .where(eq(bookingRequests.bookingRequestId, bookingRequest.bookingRequestId));
        }
        return { advanced: false };
    }

    let nextPaymentStatus: BookingRequestOfferPaymentStatus = offer.paymentStatus;
    let nextPaymentData = offer.paymentData;
    let nextPaymentDateTime = offer.paymentDateTime;
    let enqueuePullJobs = false;

    if ('paymentIntentId' in offer.paymentData && offer.paymentData.paymentIntentId) {
        const succeeded = await serverRuntime.stripe.paymentIntentSucceededCheck(offer.paymentData.paymentIntentId);
        if (!succeeded) {
            throw new Error('bookingRequestOfferPaymentFinalize: payment intent not succeeded');
        }
        const extraTransferId = await bookingRequestOfferExtraTransferMaybeCreate(serverRuntime, {
            destinationAccountId: cookStripeAccountId,
            userId: customerUserId,
            totalCentsCustomer: offer.totalCentsCustomer ?? 0,
            payoutCentsCook: offer.payoutCentsCook,
        });
        nextPaymentData = await paymentDataWithTransferId(serverRuntime, offer.paymentData);
        if (extraTransferId && 'paymentIntentId' in nextPaymentData) {
            nextPaymentData = { ...nextPaymentData, extraTransferId };
        }
        nextPaymentStatus = 'PAYED';
        nextPaymentDateTime = new Date();
    } else if ('setupIntentId' in offer.paymentData && offer.paymentData.setupIntentId) {
        if (offer.paymentStatus === 'SETUP') {
            if (invoiceAddress) {
                await serverRuntime.db
                    .update(bookingRequests)
                    .set({ invoiceAddress })
                    .where(eq(bookingRequests.bookingRequestId, bookingRequest.bookingRequestId));
            }
            return { advanced: false };
        }
        const succeeded = await serverRuntime.stripe.setupIntentSucceededCheck(offer.paymentData.setupIntentId);
        if (!succeeded) {
            throw new Error('bookingRequestOfferPaymentFinalize: setup intent not succeeded');
        }
        nextPaymentStatus = 'SETUP';
        enqueuePullJobs = true;
    } else if ('transferId' in offer.paymentData) {
        nextPaymentStatus = 'PAYED';
        nextPaymentDateTime = offer.paymentDateTime ?? new Date();
    } else {
        throw new Error('bookingRequestOfferPaymentFinalize: unrecognized paymentData');
    }

    await serverRuntime.db.transaction(async (transaction) => {
        await transaction
            .update(bookingRequestOffers)
            .set({
                paymentStatus: nextPaymentStatus,
                paymentData: nextPaymentData,
                paymentDateTime: nextPaymentDateTime,
            })
            .where(eq(bookingRequestOffers.bookingRequestOfferId, offer.bookingRequestOfferId));

        if (invoiceAddress) {
            await transaction
                .update(bookingRequests)
                .set({ invoiceAddress })
                .where(eq(bookingRequests.bookingRequestId, bookingRequest.bookingRequestId));
        }
    });

    if (enqueuePullJobs) {
        await serverRuntime.jobs.enqueue(
            bookingRequestOfferPullPayment,
            { bookingRequestOfferId: offer.bookingRequestOfferId },
            { startAfter: bookingRequestOfferPullPaymentDueDate(bookingRequest.dateTime) },
        );
        if (bookingRequestOfferShouldAnnouncePull(bookingRequest.dateTime)) {
            await serverRuntime.jobs.enqueue(
                bookingRequestOfferPullPaymentAnnouncement,
                { bookingRequestOfferId: offer.bookingRequestOfferId },
                { startAfter: bookingRequestOfferPullAnnouncementDueDate(bookingRequest.dateTime) },
            );
        }
    }

    if (nextPaymentStatus === 'PAYED') {
        const { scheduleTestimonialReminderJobs } = await import('./scheduleTestimonialReminderJobs');
        await scheduleTestimonialReminderJobs(serverRuntime, {
            bookingRequestOfferId: offer.bookingRequestOfferId,
            eventDate: bookingRequest.dateTime,
        });
        const { bookingRequestOfferEventTomorrowNotifySchedule } = await import('./bookingRequestOfferEventTomorrowNotifySchedule');
        await bookingRequestOfferEventTomorrowNotifySchedule(serverRuntime, {
            bookingRequestId: bookingRequest.bookingRequestId,
            bookingRequestOfferId: offer.bookingRequestOfferId,
            eventDate: bookingRequest.dateTime,
        });
        await bookingRequestOfferPaymentSucceededSessionEventCreate(serverRuntime, {
            sessionId,
            customerUserId,
            bookingRequestId: bookingRequest.bookingRequestId,
            bookingRequestOfferId: offer.bookingRequestOfferId,
        });
    }

    await bookingRequestOfferPaymentConfirmedEmailSend(serverRuntime, { offer, bookingRequest });

    const { slackNotifyPaymentConfirmed } = await import('../slack/slackNotifyBooking');
    await slackNotifyPaymentConfirmed(serverRuntime, {
        bookingRequestId: bookingRequest.bookingRequestId,
        bookingRequestOfferId: offer.bookingRequestOfferId,
        amountCents: offer.totalCentsCustomer ?? offer.totalWithoutDiscountsCentsCustomer,
    });

    return { advanced: true };
}
