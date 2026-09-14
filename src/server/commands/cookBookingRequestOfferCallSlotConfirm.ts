import { and, eq, ne } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests, cookCallSlotBookings } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCookMutation,
    GqlSCookMutationBookingRequestOfferCallSlotConfirmArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { slackNotifyCallSlotEvent } from '../slack/slackNotifyCallSlot';
import { bookingRequestOfferCallSlotConfirmEmailSend } from '../utils/bookingRequestOfferCallSlotEmails';
import { bookingRequestOfferCallSlotReminderSchedule } from '../utils/bookingRequestOfferCallSlotReminderSchedule';
import {
    bookingRequestOfferCallSlotsCompleteCancel,
    bookingRequestOfferCallSlotsCompleteSchedule,
} from '../utils/bookingRequestOfferCallSlotsCompleteSchedule';
import { bookingRequestOfferCallWritableAssert } from '../utils/bookingRequestOfferCallWritableAssert';

export async function cookBookingRequestOfferCallSlotConfirm(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationBookingRequestOfferCallSlotConfirmArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    const { cookCallSlotBookingId } = args;
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
            throw new Error('cookBookingRequestOfferCallSlotConfirm: booking not found');
        }

        bookingRequestOfferCallWritableAssert({ offer: row.offer, bookingRequest: row.bookingRequest });

        if (row.booking.status !== 'PENDING') {
            throw new Error('cookBookingRequestOfferCallSlotConfirm: booking is not PENDING');
        }
        if (row.booking.initiator !== 'CUSTOMER') {
            throw new Error('cookBookingRequestOfferCallSlotConfirm: only customer-initiated slots can be confirmed by cook');
        }

        const siblingPendingBookings = await serverRuntime.db
            .select()
            .from(cookCallSlotBookings)
            .where(
                and(
                    eq(cookCallSlotBookings.bookingRequestOfferId, row.booking.bookingRequestOfferId),
                    eq(cookCallSlotBookings.status, 'PENDING'),
                    ne(cookCallSlotBookings.cookCallSlotBookingId, cookCallSlotBookingId),
                ),
            );

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction
                .update(cookCallSlotBookings)
                .set({ status: 'CONFIRMED', lastModifiedAt: now })
                .where(eq(cookCallSlotBookings.cookCallSlotBookingId, cookCallSlotBookingId));

            for (const sibling of siblingPendingBookings) {
                await transaction
                    .update(cookCallSlotBookings)
                    .set({
                        status: 'CANCELED',
                        canceledBy: 'COOK',
                        canceledReason: 'ANOTHER_SLOT_CONFIRMED',
                        lastModifiedAt: now,
                    })
                    .where(eq(cookCallSlotBookings.cookCallSlotBookingId, sibling.cookCallSlotBookingId));
            }

            await transaction
                .update(bookingRequestOffers)
                .set({ userUnreadNotificationCount: row.offer.userUnreadNotificationCount + 1 })
                .where(eq(bookingRequestOffers.bookingRequestOfferId, row.booking.bookingRequestOfferId));

            await transaction.insert(bookingRequestOfferEvents).values({
                bookingRequestOfferEventId,
                bookingRequestOfferId: row.booking.bookingRequestOfferId,
                type: 'COOK_CALL_SLOT_CONFIRMED',
                payload: {
                    cookCallSlotBookingId,
                    startAt: row.booking.startAt.toISOString(),
                    endAt: row.booking.endAt.toISOString(),
                },
            });

            if (siblingPendingBookings.length > 0) {
                await transaction.insert(bookingRequestOfferEvents).values(
                    siblingPendingBookings.map((sibling) => ({
                        bookingRequestOfferEventId: idCreate(),
                        bookingRequestOfferId: row.booking.bookingRequestOfferId,
                        type: 'COOK_CALL_SLOT_CANCELLED' as const,
                        payload: {
                            cookCallSlotBookingId: sibling.cookCallSlotBookingId,
                            startAt: sibling.startAt.toISOString(),
                            endAt: sibling.endAt.toISOString(),
                            wasConfirmed: false,
                            reason: 'ANOTHER_SLOT_CONFIRMED',
                        },
                    })),
                );
            }
        });

        await bookingRequestOfferCallSlotReminderSchedule(serverRuntime, {
            cookCallSlotBookingId,
            startAt: row.booking.startAt,
        });
        await bookingRequestOfferCallSlotsCompleteSchedule(serverRuntime, {
            cookCallSlotBookingId,
            endAt: row.booking.endAt,
            status: 'CONFIRMED',
        });
        await Promise.all(
            siblingPendingBookings.map((sibling) =>
                bookingRequestOfferCallSlotsCompleteCancel(serverRuntime, sibling.cookCallSlotBookingId),
            ),
        );

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId: cookId }),
            serverRuntime.publish.userUpdates({ userId: row.bookingRequest.userId }),
            serverRuntime.publish.adminUpdates(),
            bookingRequestOfferCallSlotConfirmEmailSend(serverRuntime, {
                cookCallSlotBookingId,
                recipient: 'CUSTOMER',
            }),
        ]);

        await slackNotifyCallSlotEvent(serverRuntime, {
            bookingRequestId: row.bookingRequest.bookingRequestId,
            bookingRequestOfferId: row.offer.bookingRequestOfferId,
            action: 'confirmed',
            actor: 'cook',
            startAt: row.booking.startAt,
        });

        return { success: true, referenceId: cookCallSlotBookingId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
