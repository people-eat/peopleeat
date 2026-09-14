import { and, eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests, cookCallSlotBookings, cooks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSCookMutation,
    GqlSCookMutationBookingRequestOfferCallSlotRequestArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { slackNotifyCallSlotEvent } from '../slack/slackNotifyCallSlot';
import { bookingRequestOfferCallSlotRequestEmailSend } from '../utils/bookingRequestOfferCallSlotEmails';
import { bookingRequestOfferCallSlotsCompleteSchedule } from '../utils/bookingRequestOfferCallSlotsCompleteSchedule';
import { bookingRequestOfferCallWritableAssert } from '../utils/bookingRequestOfferCallWritableAssert';
import { cookCallSlotCalendarOverlapAssert } from '../utils/cookCallSlotCalendarOverlapAssert';

export async function cookBookingRequestOfferCallSlotRequest(
    { cookId }: GqlSCookMutation,
    args: GqlSCookMutationBookingRequestOfferCallSlotRequestArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(cookId, serverRuntime);

    const { bookingRequestOfferId } = args;
    const startAt = new Date(args.startAt);
    if (Number.isNaN(startAt.getTime())) {
        throw new Error('cookBookingRequestOfferCallSlotRequest: invalid startAt');
    }
    if (startAt.getTime() <= Date.now()) {
        throw new Error('cookBookingRequestOfferCallSlotRequest: startAt must be in the future');
    }

    const cookMessage = args.cookMessage?.trim() || undefined;
    const cookCallSlotBookingId = idCreate();
    const bookingRequestOfferEventId = idCreate();

    try {
        const [row] = await serverRuntime.db
            .select({
                offer: bookingRequestOffers,
                bookingRequest: bookingRequests,
                callSchedulingEnabled: cooks.callSchedulingEnabled,
                callDurationMinutes: cooks.callDurationMinutes,
            })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .innerJoin(cooks, eq(cooks.cookId, bookingRequestOffers.cookId))
            .where(and(eq(bookingRequestOffers.cookId, cookId), eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId)))
            .limit(1);

        if (!row) {
            throw new Error('cookBookingRequestOfferCallSlotRequest: offer not found');
        }

        bookingRequestOfferCallWritableAssert({ offer: row.offer, bookingRequest: row.bookingRequest });

        if (!row.callSchedulingEnabled) {
            throw new Error('cookBookingRequestOfferCallSlotRequest: cook call scheduling disabled');
        }

        const [confirmed] = await serverRuntime.db
            .select({ cookCallSlotBookingId: cookCallSlotBookings.cookCallSlotBookingId })
            .from(cookCallSlotBookings)
            .where(and(eq(cookCallSlotBookings.bookingRequestOfferId, bookingRequestOfferId), eq(cookCallSlotBookings.status, 'CONFIRMED')))
            .limit(1);

        if (confirmed) {
            throw new Error('cookBookingRequestOfferCallSlotRequest: offer already has a CONFIRMED call slot');
        }

        const endAt = new Date(startAt.getTime() + row.callDurationMinutes * 60_000);

        await cookCallSlotCalendarOverlapAssert(serverRuntime.db, {
            cookId,
            startAt,
            endAt,
        });

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction.insert(cookCallSlotBookings).values({
                cookCallSlotBookingId,
                cookId,
                userId: row.bookingRequest.userId,
                bookingRequestOfferId,
                startAt,
                endAt,
                status: 'PENDING',
                initiator: 'COOK',
                cookMessage: cookMessage ?? null,
            });

            await transaction
                .update(bookingRequestOffers)
                .set({ userUnreadNotificationCount: row.offer.userUnreadNotificationCount + 1 })
                .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

            await transaction.insert(bookingRequestOfferEvents).values({
                bookingRequestOfferEventId,
                bookingRequestOfferId,
                type: 'COOK_CALL_SLOT_REQUESTED',
                payload: {
                    cookCallSlotBookingId,
                    startAt: startAt.toISOString(),
                    endAt: endAt.toISOString(),
                    ...(cookMessage ? { cookMessage } : {}),
                },
            });
        });

        await bookingRequestOfferCallSlotsCompleteSchedule(serverRuntime, {
            cookCallSlotBookingId,
            endAt,
            status: 'PENDING',
        });

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId: cookId }),
            serverRuntime.publish.userUpdates({ userId: row.bookingRequest.userId }),
            serverRuntime.publish.adminUpdates(),
            bookingRequestOfferCallSlotRequestEmailSend(serverRuntime, {
                cookCallSlotBookingId,
                recipient: 'CUSTOMER',
            }),
        ]);

        await slackNotifyCallSlotEvent(serverRuntime, {
            bookingRequestId: row.bookingRequest.bookingRequestId,
            bookingRequestOfferId,
            action: 'requested',
            actor: 'cook',
            startAt,
        });

        return { success: true, referenceId: cookCallSlotBookingId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
