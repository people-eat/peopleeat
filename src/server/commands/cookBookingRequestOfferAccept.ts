import { and, eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests, users } from '../db/schema';
import { bookingRequestOfferPaymentIsPaid } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCookMutation,
    GqlSCookMutationBookingRequestOfferAcceptArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { slackNotifyOfferAccept } from '../slack/slackNotifyBooking';
import { bookingRequestOfferEventTomorrowNotifySchedule } from '../utils/bookingRequestOfferEventTomorrowNotifySchedule';
import { bookingRequestOfferNegotiationAssert } from '../utils/bookingRequestOfferNegotiationAssert';
import { scheduleTestimonialReminderJobs } from '../utils/scheduleTestimonialReminderJobs';
import { sessionEventCreate } from '../utils/sessionEventCreate';
import { userActiveStatusAssert } from '../utils/userActiveStatusAssert';

export async function cookBookingRequestOfferAccept(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationBookingRequestOfferAcceptArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);
    await userActiveStatusAssert(cookId, serverRuntime, 'cookBookingRequestOfferAccept');

    const { bookingRequestOfferId } = args;

    try {
        const [row] = await serverRuntime.db
            .select({ offer: bookingRequestOffers, bookingRequest: bookingRequests })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(and(eq(bookingRequestOffers.cookId, cookId), eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId)))
            .limit(1);

        if (!row) {
            throw new Error('cookBookingRequestOfferAccept: offer not found');
        }

        bookingRequestOfferNegotiationAssert(row.offer);

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction
                .update(bookingRequestOffers)
                .set({
                    cookAccepted: true,
                    userUnreadNotificationCount: row.offer.userUnreadNotificationCount + 1,
                    priceAutoAdjustReason: null,
                })
                .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

            await transaction.insert(bookingRequestOfferEvents).values({
                bookingRequestOfferEventId: idCreate(),
                bookingRequestOfferId,
                type: 'COOK_ACCEPTED',
                payload: {},
            });
        });

        // Re-acceptance after a customer edit (dateTime, venue, …) on an
        // already-paid offer — reschedule testimonial reminders off the
        // (possibly new) event date.
        if (bookingRequestOfferPaymentIsPaid(row.offer.paymentStatus)) {
            await scheduleTestimonialReminderJobs(serverRuntime, {
                bookingRequestOfferId,
                eventDate: row.bookingRequest.dateTime,
            });
            await bookingRequestOfferEventTomorrowNotifySchedule(serverRuntime, {
                bookingRequestId: row.bookingRequest.bookingRequestId,
                bookingRequestOfferId,
                eventDate: row.bookingRequest.dateTime,
            });
        }

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId: cookId }),
            serverRuntime.publish.userUpdates({ userId: row.bookingRequest.userId }),
            serverRuntime.publish.adminUpdates(),
        ]);

        const [cookUser] = await serverRuntime.db
            .select({ firstName: users.firstName, lastName: users.lastName })
            .from(users)
            .where(eq(users.userId, cookId))
            .limit(1);
        const dualAccepted = row.offer.userAccepted === true;

        await slackNotifyOfferAccept(serverRuntime, {
            bookingRequestId: row.bookingRequest.bookingRequestId,
            bookingRequestOfferId,
            actor: 'cook',
            name: cookUser ? `${cookUser.firstName} ${cookUser.lastName}` : cookId,
            dualAccepted,
        });

        await sessionEventCreate(serverRuntime, {
            sessionId: requestingSession.sessionId,
            type: 'BOOKING_REQUEST_OFFER_ACCEPTED',
            payload: {
                bookingRequestId: row.bookingRequest.bookingRequestId,
                bookingRequestOfferId,
                actor: 'cook',
            },
        });

        return { success: true, referenceId: bookingRequestOfferId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
