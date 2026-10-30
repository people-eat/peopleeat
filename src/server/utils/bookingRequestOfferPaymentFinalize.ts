import { and, eq, notInArray, sql } from 'drizzle-orm';

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
import { paymentDataWithExtraTransfer } from './bookingRequestOfferPaymentDataTransfers';
import {
    bookingRequestOfferPullAnnouncementDueDate,
    bookingRequestOfferPullPaymentDueDate,
    bookingRequestOfferShouldAnnouncePull,
} from './bookingRequestOfferPaymentPrepare';
import { bookingRequestOfferPaymentSucceededSessionEventCreate } from './bookingRequestOfferPaymentSessionEventCreate';

/** Statuses that already mean PI / €0 finalize has won — further PI claims no-op. */
const PAYED_CLAIM_BLOCKING_STATUSES: BookingRequestOfferPaymentStatus[] = ['PAYED', 'PAYED_OUT_OF_SYSTEM', 'TRANSFERRED'];

/** Statuses that already mean SI finalize has won (or payment already completed). */
const SETUP_CLAIM_BLOCKING_STATUSES: BookingRequestOfferPaymentStatus[] = ['SETUP', 'PAYED', 'PAYED_OUT_OF_SYSTEM', 'TRANSFERRED'];

type PaymentFinalizeExpected = {
    nextPaymentStatus: BookingRequestOfferPaymentStatus;
    amountCents: number;
    paymentIntentId?: string;
    setupIntentId?: string;
};

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

function paymentDataIntentIds(paymentData: BookingRequestOfferPaymentData | null | undefined): {
    paymentIntentId?: string;
    setupIntentId?: string;
} {
    if (!paymentData) return {};
    return {
        paymentIntentId: 'paymentIntentId' in paymentData ? paymentData.paymentIntentId : undefined,
        setupIntentId: 'setupIntentId' in paymentData ? paymentData.setupIntentId : undefined,
    };
}

function offerAmountCents(offer: Pick<BookingRequestOffer, 'totalCentsCustomer' | 'totalWithoutDiscountsCentsCustomer'>): number {
    return offer.totalCentsCustomer ?? offer.totalWithoutDiscountsCentsCustomer;
}

function paymentFinalizeIdentityMatches(
    stored: Pick<BookingRequestOffer, 'paymentStatus' | 'paymentData' | 'totalCentsCustomer' | 'totalWithoutDiscountsCentsCustomer'>,
    expected: PaymentFinalizeExpected,
): boolean {
    if (offerAmountCents(stored) !== expected.amountCents) {
        return false;
    }

    const statusOk =
        expected.nextPaymentStatus === 'SETUP'
            ? SETUP_CLAIM_BLOCKING_STATUSES.includes(stored.paymentStatus)
            : PAYED_CLAIM_BLOCKING_STATUSES.includes(stored.paymentStatus);
    if (!statusOk) {
        return false;
    }

    const ids = paymentDataIntentIds(stored.paymentData);
    if (expected.paymentIntentId != null && ids.paymentIntentId !== expected.paymentIntentId) {
        return false;
    }
    if (expected.setupIntentId != null && ids.setupIntentId !== expected.setupIntentId) {
        return false;
    }
    return true;
}

async function paymentFinalizeAlreadyAdvancedHandle(
    serverRuntime: ServerRuntime,
    args: {
        bookingRequestId: string;
        bookingRequestOfferId: string;
        expected: PaymentFinalizeExpected;
        invoiceAddress?: BookingRequestInvoiceAddress | null;
    },
): Promise<{ advanced: false }> {
    if (args.invoiceAddress) {
        await serverRuntime.db
            .update(bookingRequests)
            .set({ invoiceAddress: args.invoiceAddress })
            .where(eq(bookingRequests.bookingRequestId, args.bookingRequestId));
    }

    const [stored] = await serverRuntime.db
        .select({
            paymentStatus: bookingRequestOffers.paymentStatus,
            paymentData: bookingRequestOffers.paymentData,
            totalCentsCustomer: bookingRequestOffers.totalCentsCustomer,
            totalWithoutDiscountsCentsCustomer: bookingRequestOffers.totalWithoutDiscountsCentsCustomer,
        })
        .from(bookingRequestOffers)
        .where(eq(bookingRequestOffers.bookingRequestOfferId, args.bookingRequestOfferId))
        .limit(1);

    if (!stored) {
        serverRuntime.log.warn(`bookingRequestOfferPaymentFinalize: offer ${args.bookingRequestOfferId} missing after lost claim`);
        return { advanced: false };
    }

    if (paymentFinalizeIdentityMatches(stored, args.expected)) {
        return { advanced: false };
    }

    const storedIds = paymentDataIntentIds(stored.paymentData);
    const detail = [
        `Erwartet: status=${args.expected.nextPaymentStatus}, betrag=${args.expected.amountCents}`,
        args.expected.paymentIntentId ? `pi=${args.expected.paymentIntentId}` : undefined,
        args.expected.setupIntentId ? `si=${args.expected.setupIntentId}` : undefined,
        `Gespeichert: status=${stored.paymentStatus}, betrag=${offerAmountCents(stored)}`,
        storedIds.paymentIntentId ? `pi=${storedIds.paymentIntentId}` : undefined,
        storedIds.setupIntentId ? `si=${storedIds.setupIntentId}` : undefined,
    ]
        .filter(Boolean)
        .join(', ');

    serverRuntime.log.warn(`bookingRequestOfferPaymentFinalize: mismatch for offer ${args.bookingRequestOfferId}: ${detail}`);

    const { slackNotifyPaymentFinalizeMismatch } = await import('../slack/slackNotifyBooking');
    await slackNotifyPaymentFinalizeMismatch(serverRuntime, {
        bookingRequestId: args.bookingRequestId,
        bookingRequestOfferId: args.bookingRequestOfferId,
        detail,
    });

    return { advanced: false };
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
 * for SetupIntent flows. Dual channel (checkout mutation + webhook) is fine:
 * status transition is an atomic claim — only the winner sends Slack/email/jobs.
 */
export async function bookingRequestOfferPaymentFinalize(
    serverRuntime: ServerRuntime,
    input: BookingRequestOfferPaymentFinalizeInput,
): Promise<{ advanced: boolean }> {
    const { offer, bookingRequest, customerUserId, cookStripeAccountId, invoiceAddress, sessionId } = input;

    if (!(offer.userAccepted === true && offer.cookAccepted === true) || !offer.paymentData) {
        throw new Error('bookingRequestOfferPaymentFinalize: offer not dual-accepted or missing paymentData');
    }

    const amountCents = offerAmountCents(offer);
    const pendingDelta = 'pendingDeltaPayment' in offer.paymentData ? offer.paymentData.pendingDeltaPayment : undefined;

    if (offer.paymentStatus === 'PAYED' && pendingDelta) {
        const succeeded = await serverRuntime.stripe.paymentIntentSucceededCheck(pendingDelta.paymentIntentId);
        if (!succeeded) {
            throw new Error('bookingRequestOfferPaymentFinalize: pending delta payment intent not succeeded');
        }
        const cookPayoutForSplit = Math.max(0, pendingDelta.cookPayoutDeltaCents ?? pendingDelta.amountCents);
        const extraTransferId = await bookingRequestOfferExtraTransferMaybeCreate(serverRuntime, {
            destinationAccountId: cookStripeAccountId,
            userId: customerUserId,
            totalCentsCustomer: pendingDelta.amountCents,
            payoutCentsCook: cookPayoutForSplit,
            idempotencyKey: `pending-delta:${pendingDelta.paymentIntentId}:extra-transfer`,
        });
        let clearedPending: BookingRequestOfferPaymentData = {
            ...offer.paymentData,
            clientSecret:
                'clientSecret' in offer.paymentData && offer.paymentData.clientSecret !== pendingDelta.clientSecret
                    ? offer.paymentData.clientSecret
                    : undefined,
        } as BookingRequestOfferPaymentData;
        if (extraTransferId) {
            clearedPending = paymentDataWithExtraTransfer(clearedPending, extraTransferId);
        }
        // Drop pendingDeltaPayment key for cleaner JSON.
        if ('pendingDeltaPayment' in clearedPending) {
            delete (clearedPending as { pendingDeltaPayment?: unknown }).pendingDeltaPayment;
        }

        const claimed = await serverRuntime.db.transaction(async (transaction) => {
            const [row] = await transaction
                .update(bookingRequestOffers)
                .set({ paymentData: clearedPending })
                .where(
                    and(
                        eq(bookingRequestOffers.bookingRequestOfferId, offer.bookingRequestOfferId),
                        sql`${bookingRequestOffers.paymentData}->'pendingDeltaPayment'->>'paymentIntentId' = ${pendingDelta.paymentIntentId}`,
                    ),
                )
                .returning({ bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId });
            if (invoiceAddress) {
                await transaction
                    .update(bookingRequests)
                    .set({ invoiceAddress })
                    .where(eq(bookingRequests.bookingRequestId, bookingRequest.bookingRequestId));
            }
            return row;
        });
        return { advanced: claimed != null };
    }

    if (offer.paymentStatus === 'PAYED' || offer.paymentStatus === 'PAYED_OUT_OF_SYSTEM' || offer.paymentStatus === 'TRANSFERRED') {
        const ids = paymentDataIntentIds(offer.paymentData);
        return paymentFinalizeAlreadyAdvancedHandle(serverRuntime, {
            bookingRequestId: bookingRequest.bookingRequestId,
            bookingRequestOfferId: offer.bookingRequestOfferId,
            invoiceAddress,
            expected: {
                nextPaymentStatus: 'PAYED',
                amountCents,
                paymentIntentId: ids.paymentIntentId,
                setupIntentId: ids.setupIntentId,
            },
        });
    }

    let nextPaymentStatus: BookingRequestOfferPaymentStatus = offer.paymentStatus;
    let nextPaymentData = offer.paymentData;
    let nextPaymentDateTime = offer.paymentDateTime;
    let enqueuePullJobs = false;
    let expectedPaymentIntentId: string | undefined;
    let expectedSetupIntentId: string | undefined;

    if ('paymentIntentId' in offer.paymentData && offer.paymentData.paymentIntentId) {
        expectedPaymentIntentId = offer.paymentData.paymentIntentId;
        const succeeded = await serverRuntime.stripe.paymentIntentSucceededCheck(offer.paymentData.paymentIntentId);
        if (!succeeded) {
            throw new Error('bookingRequestOfferPaymentFinalize: payment intent not succeeded');
        }
        const extraTransferId = await bookingRequestOfferExtraTransferMaybeCreate(serverRuntime, {
            destinationAccountId: cookStripeAccountId,
            userId: customerUserId,
            totalCentsCustomer: offer.totalCentsCustomer ?? 0,
            payoutCentsCook: offer.payoutCentsCook,
            idempotencyKey: `offer-payment:${offer.paymentData.paymentIntentId}:extra-transfer`,
        });
        nextPaymentData = await paymentDataWithTransferId(serverRuntime, offer.paymentData);
        if (extraTransferId) {
            nextPaymentData = paymentDataWithExtraTransfer(nextPaymentData, extraTransferId);
        }
        nextPaymentStatus = 'PAYED';
        nextPaymentDateTime = new Date();
    } else if ('setupIntentId' in offer.paymentData && offer.paymentData.setupIntentId) {
        expectedSetupIntentId = offer.paymentData.setupIntentId;
        if (offer.paymentStatus === 'SETUP') {
            return paymentFinalizeAlreadyAdvancedHandle(serverRuntime, {
                bookingRequestId: bookingRequest.bookingRequestId,
                bookingRequestOfferId: offer.bookingRequestOfferId,
                invoiceAddress,
                expected: {
                    nextPaymentStatus: 'SETUP',
                    amountCents,
                    setupIntentId: expectedSetupIntentId,
                },
            });
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

    const claimBlockingStatuses = nextPaymentStatus === 'SETUP' ? SETUP_CLAIM_BLOCKING_STATUSES : PAYED_CLAIM_BLOCKING_STATUSES;

    const claimed = await serverRuntime.db.transaction(async (transaction) => {
        const [row] = await transaction
            .update(bookingRequestOffers)
            .set({
                paymentStatus: nextPaymentStatus,
                paymentData: nextPaymentData,
                paymentDateTime: nextPaymentDateTime,
            })
            .where(
                and(
                    eq(bookingRequestOffers.bookingRequestOfferId, offer.bookingRequestOfferId),
                    notInArray(bookingRequestOffers.paymentStatus, claimBlockingStatuses),
                ),
            )
            .returning({ bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId });

        if (invoiceAddress) {
            await transaction
                .update(bookingRequests)
                .set({ invoiceAddress })
                .where(eq(bookingRequests.bookingRequestId, bookingRequest.bookingRequestId));
        }
        return row;
    });

    if (!claimed) {
        // Invoice address (if any) was already applied in the claim transaction above.
        return paymentFinalizeAlreadyAdvancedHandle(serverRuntime, {
            bookingRequestId: bookingRequest.bookingRequestId,
            bookingRequestOfferId: offer.bookingRequestOfferId,
            expected: {
                nextPaymentStatus,
                amountCents,
                paymentIntentId: expectedPaymentIntentId,
                setupIntentId: expectedSetupIntentId,
            },
        });
    }

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
        amountCents,
    });

    return { advanced: true };
}
