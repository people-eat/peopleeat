import { eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import type { BookingRequest, BookingRequestOffer } from '../db/schema';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests } from '../db/schema';
import { bookingRequestCancelableStatuses, bookingRequestStatusDerive } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { slackNotifyBookingRequestCanceled } from '../slack/slackNotifyBooking';
import { userBookingRequestCancelEmailSend } from './bookingRequestLifecycleEmails';
import {
    bookingRequestOfferPendingCallSlotsClose,
    bookingRequestOfferPendingCallSlotsCompleteJobsCancel,
} from './bookingRequestOfferPendingCallSlotsClose';
import { bookingRequestOfferQueuedJobsCancel } from './bookingRequestOfferQueuedJobsCancel';
import { bookingRequestQueuedJobsCancel } from './bookingRequestQueuedJobsCancel';

export type BookingRequestCancelApplyResult = {
    bookingRequestId: string;
    customerUserId: string;
    cookIds: string[];
};

/**
 * Shared cancel core for customer and admin paths: validate cancelable status,
 * stamp cancel fields, decline offers, write `USER_CANCELLED` events, emails + Slack.
 */
export async function bookingRequestCancelApply(
    serverRuntime: ServerRuntime,
    input: {
        bookingRequest: BookingRequest;
        offers: BookingRequestOffer[];
        reason: string;
    },
): Promise<BookingRequestCancelApplyResult> {
    const { bookingRequest, offers, reason } = input;
    const bookingRequestId = bookingRequest.bookingRequestId;
    const customerUserId = bookingRequest.userId;

    const accepted = offers.find((offer) => offer.userAccepted === true && offer.cookAccepted === true);
    const status = bookingRequestStatusDerive({
        offerCount: offers.length,
        acceptedOfferPaymentStatus: accepted?.paymentStatus ?? null,
        canceledAt: bookingRequest.canceledAt,
        expiresAt: bookingRequest.expiresAt,
        eventDate: bookingRequest.dateTime,
    });

    if (!bookingRequestCancelableStatuses.has(status)) {
        throw new Error('bookingRequestCancelApply: booking request is not cancelable');
    }

    const canceledAt = new Date();

    const closedCallSlotBookingIds = await serverRuntime.db.transaction(async (transaction) => {
        await transaction
            .update(bookingRequests)
            .set({
                canceledAt,
                cancellationReason: reason,
            })
            .where(eq(bookingRequests.bookingRequestId, bookingRequestId));

        await transaction
            .update(bookingRequestOffers)
            .set({ userAccepted: false })
            .where(eq(bookingRequestOffers.bookingRequestId, bookingRequestId));

        if (offers.length > 0) {
            await transaction.insert(bookingRequestOfferEvents).values(
                offers.map((offer) => ({
                    bookingRequestOfferEventId: idCreate(),
                    bookingRequestOfferId: offer.bookingRequestOfferId,
                    type: 'USER_CANCELLED' as const,
                    payload: { reason },
                    createdAt: canceledAt,
                })),
            );
        }

        return bookingRequestOfferPendingCallSlotsClose(transaction, {
            bookingRequestOfferIds: offers.map((offer) => offer.bookingRequestOfferId),
            reason: { kind: 'BOOKING_REQUEST_CANCELED' },
            now: canceledAt,
        });
    });

    await bookingRequestQueuedJobsCancel(serverRuntime, bookingRequestId);
    await Promise.all([
        ...offers.map((offer) => bookingRequestOfferQueuedJobsCancel(serverRuntime, offer.bookingRequestOfferId)),
        bookingRequestOfferPendingCallSlotsCompleteJobsCancel(serverRuntime, closedCallSlotBookingIds),
    ]);

    const cookIds = [...new Set(offers.map((offer) => offer.cookId))];
    await Promise.all([
        serverRuntime.publish.userUpdates({ userId: customerUserId }),
        ...cookIds.map((cookId) => serverRuntime.publish.userUpdates({ userId: cookId })),
        serverRuntime.publish.adminUpdates(),
    ]);

    await userBookingRequestCancelEmailSend(serverRuntime, {
        bookingRequestId,
        customerUserId,
        cookIds,
        reason,
    });

    await slackNotifyBookingRequestCanceled(serverRuntime, {
        bookingRequestId,
        userId: customerUserId,
        reason,
    });

    return { bookingRequestId, customerUserId, cookIds };
}
