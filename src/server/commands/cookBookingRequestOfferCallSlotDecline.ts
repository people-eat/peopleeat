import { and, eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests, cookCallSlotBookings } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCookMutation,
    GqlSCookMutationBookingRequestOfferCallSlotDeclineArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { slackNotifyCallSlotEvent } from '../slack/slackNotifyCallSlot';
import { bookingRequestOfferCallSlotDeclineEmailSend } from '../utils/bookingRequestOfferCallSlotEmails';
import { bookingRequestOfferCallSlotsCompleteCancel } from '../utils/bookingRequestOfferCallSlotsCompleteSchedule';
import { bookingRequestOfferCallWritableAssert } from '../utils/bookingRequestOfferCallWritableAssert';

export async function cookBookingRequestOfferCallSlotDecline(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationBookingRequestOfferCallSlotDeclineArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    const { cookCallSlotBookingId } = args;
    const declineReason = args.reason?.trim() || undefined;
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
            throw new Error('cookBookingRequestOfferCallSlotDecline: booking not found');
        }

        bookingRequestOfferCallWritableAssert({ offer: row.offer, bookingRequest: row.bookingRequest });

        if (row.booking.status !== 'PENDING') {
            throw new Error('cookBookingRequestOfferCallSlotDecline: booking is not PENDING');
        }
        if (row.booking.initiator !== 'CUSTOMER') {
            throw new Error('cookBookingRequestOfferCallSlotDecline: only customer-initiated slots can be declined by cook');
        }

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction
                .update(cookCallSlotBookings)
                .set({
                    status: 'DECLINED',
                    declineReason: declineReason ?? null,
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
                type: 'COOK_CALL_SLOT_DECLINED',
                payload: {
                    cookCallSlotBookingId,
                    startAt: row.booking.startAt.toISOString(),
                    endAt: row.booking.endAt.toISOString(),
                    ...(declineReason ? { declineReason } : {}),
                },
            });
        });

        await bookingRequestOfferCallSlotsCompleteCancel(serverRuntime, cookCallSlotBookingId);

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId: cookId }),
            serverRuntime.publish.userUpdates({ userId: row.bookingRequest.userId }),
            serverRuntime.publish.adminUpdates(),
            bookingRequestOfferCallSlotDeclineEmailSend(serverRuntime, {
                cookCallSlotBookingId,
                recipient: 'CUSTOMER',
                reason: declineReason,
            }),
        ]);

        await slackNotifyCallSlotEvent(serverRuntime, {
            bookingRequestId: row.bookingRequest.bookingRequestId,
            bookingRequestOfferId: row.offer.bookingRequestOfferId,
            action: 'declined',
            actor: 'cook',
            startAt: row.booking.startAt,
        });

        return { success: true, referenceId: cookCallSlotBookingId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
