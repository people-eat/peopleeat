import { and, eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests, cookCallSlotBookings } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCookMutation,
    GqlSCookMutationBookingRequestOfferCallSlotCancelArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { slackNotifyCallSlotEvent } from '../slack/slackNotifyCallSlot';
import { bookingRequestOfferCallSlotCancelEmailSend } from '../utils/bookingRequestOfferCallSlotEmails';
import { bookingRequestOfferCallSlotsCompleteCancel } from '../utils/bookingRequestOfferCallSlotsCompleteSchedule';
import { bookingRequestOfferCallWritableAssert } from '../utils/bookingRequestOfferCallWritableAssert';

export async function cookBookingRequestOfferCallSlotCancel(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationBookingRequestOfferCallSlotCancelArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    const { cookCallSlotBookingId } = args;
    const reason = args.reason?.trim() || undefined;
    const bookingRequestOfferEventId = idCreate();
    const now = new Date();

    try {
        const [row] = await serverRuntime.db
            .select({
                booking: cookCallSlotBookings,
                offer: bookingRequestOffers,
                bookingRequest: bookingRequests,
            })
            .from(cookCallSlotBookings)
            .innerJoin(bookingRequestOffers, eq(bookingRequestOffers.bookingRequestOfferId, cookCallSlotBookings.bookingRequestOfferId))
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(and(eq(cookCallSlotBookings.cookCallSlotBookingId, cookCallSlotBookingId), eq(cookCallSlotBookings.cookId, cookId)))
            .limit(1);

        if (!row) {
            throw new Error('cookBookingRequestOfferCallSlotCancel: booking not found');
        }

        bookingRequestOfferCallWritableAssert({ offer: row.offer, bookingRequest: row.bookingRequest });

        if (row.booking.status !== 'PENDING' && row.booking.status !== 'CONFIRMED') {
            throw new Error('cookBookingRequestOfferCallSlotCancel: booking is not PENDING or CONFIRMED');
        }

        const wasConfirmed = row.booking.status === 'CONFIRMED';

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction
                .update(cookCallSlotBookings)
                .set({
                    status: 'CANCELED',
                    canceledBy: 'COOK',
                    canceledReason: reason ?? null,
                    lastModifiedAt: now,
                })
                .where(eq(cookCallSlotBookings.cookCallSlotBookingId, cookCallSlotBookingId));

            await transaction
                .update(bookingRequestOffers)
                .set({ userUnreadNotificationCount: row.offer.userUnreadNotificationCount + 1 })
                .where(eq(bookingRequestOffers.bookingRequestOfferId, row.booking.bookingRequestOfferId));

            await transaction.insert(bookingRequestOfferEvents).values({
                bookingRequestOfferEventId,
                bookingRequestOfferId: row.booking.bookingRequestOfferId,
                type: 'COOK_CALL_SLOT_CANCELLED',
                payload: {
                    cookCallSlotBookingId,
                    startAt: row.booking.startAt.toISOString(),
                    endAt: row.booking.endAt.toISOString(),
                    wasConfirmed,
                    ...(reason ? { reason } : {}),
                },
            });
        });

        await bookingRequestOfferCallSlotsCompleteCancel(serverRuntime, cookCallSlotBookingId);

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId: cookId }),
            serverRuntime.publish.userUpdates({ userId: row.bookingRequest.userId }),
            serverRuntime.publish.adminUpdates(),
            bookingRequestOfferCallSlotCancelEmailSend(serverRuntime, {
                cookCallSlotBookingId,
                recipient: 'CUSTOMER',
                reason,
                wasConfirmed,
            }),
        ]);

        await slackNotifyCallSlotEvent(serverRuntime, {
            bookingRequestId: row.bookingRequest.bookingRequestId,
            bookingRequestOfferId: row.offer.bookingRequestOfferId,
            action: 'canceled',
            actor: 'cook',
            startAt: row.booking.startAt,
        });

        return { success: true, referenceId: cookCallSlotBookingId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
