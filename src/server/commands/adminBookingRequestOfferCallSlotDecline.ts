import { eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests, cookCallSlotBookings } from '../db/schema';
import type { BookingRequestOfferEventType, CookCallSlotBookingActor } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationBookingRequestOfferCallSlotDeclineArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { slackNotifyCallSlotEvent } from '../slack/slackNotifyCallSlot';
import { bookingRequestOfferCallSlotDeclineEmailSend } from '../utils/bookingRequestOfferCallSlotEmails';
import { bookingRequestOfferCallSlotsCompleteCancel } from '../utils/bookingRequestOfferCallSlotsCompleteSchedule';
import { bookingRequestOfferCallWritableAssert } from '../utils/bookingRequestOfferCallWritableAssert';

/**
 * Admin declines a PENDING call slot on behalf of the counterparty (customer
 * or cook). Mirrors the party decline path for status, events, unread, email,
 * and Slack — attributed to the party named in `onBehalfOf`.
 */
export async function adminBookingRequestOfferCallSlotDecline(
    { adminId }: GqlSAdminMutation,
    args: GqlSAdminMutationBookingRequestOfferCallSlotDeclineArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    const { cookCallSlotBookingId, onBehalfOf } = args;
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
            .where(eq(cookCallSlotBookings.cookCallSlotBookingId, cookCallSlotBookingId))
            .limit(1);

        if (!row) {
            throw new Error('adminBookingRequestOfferCallSlotDecline: booking not found');
        }

        bookingRequestOfferCallWritableAssert({ offer: row.offer, bookingRequest: row.bookingRequest });

        if (row.booking.status !== 'PENDING') {
            throw new Error('adminBookingRequestOfferCallSlotDecline: booking is not PENDING');
        }

        const expectedOnBehalfOf: CookCallSlotBookingActor = row.booking.initiator === 'COOK' ? 'CUSTOMER' : 'COOK';
        if (onBehalfOf !== expectedOnBehalfOf) {
            throw new Error(`adminBookingRequestOfferCallSlotDecline: onBehalfOf must be ${expectedOnBehalfOf} for this pending request`);
        }

        const eventType: BookingRequestOfferEventType = onBehalfOf === 'CUSTOMER' ? 'USER_CALL_SLOT_DECLINED' : 'COOK_CALL_SLOT_DECLINED';
        const unreadPatch =
            onBehalfOf === 'CUSTOMER'
                ? { cookUnreadNotificationCount: row.offer.cookUnreadNotificationCount + 1 }
                : { userUnreadNotificationCount: row.offer.userUnreadNotificationCount + 1 };
        const emailRecipient = onBehalfOf === 'CUSTOMER' ? ('COOK' as const) : ('CUSTOMER' as const);

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
                .set(unreadPatch)
                .where(eq(bookingRequestOffers.bookingRequestOfferId, row.booking.bookingRequestOfferId));

            await transaction.insert(bookingRequestOfferEvents).values({
                bookingRequestOfferEventId,
                bookingRequestOfferId: row.booking.bookingRequestOfferId,
                type: eventType,
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
            serverRuntime.publish.userUpdates({ userId: row.bookingRequest.userId }),
            serverRuntime.publish.userUpdates({ userId: row.offer.cookId }),
            serverRuntime.publish.adminUpdates(),
            bookingRequestOfferCallSlotDeclineEmailSend(serverRuntime, {
                cookCallSlotBookingId,
                recipient: emailRecipient,
                reason: declineReason,
            }),
        ]);

        await slackNotifyCallSlotEvent(serverRuntime, {
            bookingRequestId: row.bookingRequest.bookingRequestId,
            bookingRequestOfferId: row.offer.bookingRequestOfferId,
            action: 'declined',
            actor: 'admin',
            onBehalfOf: onBehalfOf === 'CUSTOMER' ? 'customer' : 'cook',
            startAt: row.booking.startAt,
        });

        return { success: true, referenceId: cookCallSlotBookingId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
