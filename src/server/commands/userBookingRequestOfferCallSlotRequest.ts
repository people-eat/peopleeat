import { and, eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests, cookCallSlotBookings, cooks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSMutationResult,
    GqlSSession,
    GqlSUserMutation,
    GqlSUserMutationBookingRequestOfferCallSlotRequestArgs,
} from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { slackNotifyCallSlotEvent } from '../slack/slackNotifyCallSlot';
import { bookingRequestOfferCallSlotRequestEmailSend } from '../utils/bookingRequestOfferCallSlotEmails';
import { bookingRequestOfferCallSlotsCompleteSchedule } from '../utils/bookingRequestOfferCallSlotsCompleteSchedule';
import { bookingRequestOfferCallWritableAssert } from '../utils/bookingRequestOfferCallWritableAssert';
import { cookCallSlotCalendarOverlapAssert } from '../utils/cookCallSlotCalendarOverlapAssert';
import { cookCallSlotsFindMany } from '../utils/cookCallSlotsFindMany';

const SLOT_MATCH_TOLERANCE_MS = 1000;
const SLOT_LOOKUP_PAD_MS = 24 * 60 * 60_000;

export async function userBookingRequestOfferCallSlotRequest(
    { userId }: GqlSUserMutation,
    args: GqlSUserMutationBookingRequestOfferCallSlotRequestArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(userId, serverRuntime);

    const { bookingRequestOfferId } = args;
    const requestedStartAt = new Date(args.startAt);
    if (Number.isNaN(requestedStartAt.getTime())) {
        throw new Error('userBookingRequestOfferCallSlotRequest: invalid startAt');
    }

    const customerMessage = args.customerMessage?.trim() || undefined;
    const cookCallSlotBookingId = idCreate();
    const bookingRequestOfferEventId = idCreate();

    try {
        const [row] = await serverRuntime.db
            .select({
                offer: bookingRequestOffers,
                bookingRequest: bookingRequests,
                callSchedulingEnabled: cooks.callSchedulingEnabled,
            })
            .from(bookingRequestOffers)
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .innerJoin(cooks, eq(cooks.cookId, bookingRequestOffers.cookId))
            .where(and(eq(bookingRequests.userId, userId), eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId)))
            .limit(1);

        if (!row) {
            throw new Error('userBookingRequestOfferCallSlotRequest: offer not found');
        }

        bookingRequestOfferCallWritableAssert({ offer: row.offer, bookingRequest: row.bookingRequest });

        if (!row.callSchedulingEnabled) {
            throw new Error('userBookingRequestOfferCallSlotRequest: cook call scheduling disabled');
        }

        const [confirmed] = await serverRuntime.db
            .select({ cookCallSlotBookingId: cookCallSlotBookings.cookCallSlotBookingId })
            .from(cookCallSlotBookings)
            .where(and(eq(cookCallSlotBookings.bookingRequestOfferId, bookingRequestOfferId), eq(cookCallSlotBookings.status, 'CONFIRMED')))
            .limit(1);

        if (confirmed) {
            throw new Error('userBookingRequestOfferCallSlotRequest: offer already has a CONFIRMED call slot');
        }

        const slots = await cookCallSlotsFindMany(serverRuntime.db, {
            cookId: row.offer.cookId,
            from: new Date(requestedStartAt.getTime() - SLOT_LOOKUP_PAD_MS),
            to: new Date(requestedStartAt.getTime() + SLOT_LOOKUP_PAD_MS),
        });
        const matched = slots.find((slot) => Math.abs(slot.startAt.getTime() - requestedStartAt.getTime()) < SLOT_MATCH_TOLERANCE_MS);
        if (!matched) {
            throw new Error('userBookingRequestOfferCallSlotRequest: startAt is not a free derived slot');
        }

        const startAt = matched.startAt;
        const endAt = matched.endAt;

        await cookCallSlotCalendarOverlapAssert(serverRuntime.db, {
            cookId: row.offer.cookId,
            startAt,
            endAt,
        });

        await serverRuntime.db.transaction(async (transaction) => {
            await transaction.insert(cookCallSlotBookings).values({
                cookCallSlotBookingId,
                cookId: row.offer.cookId,
                userId,
                bookingRequestOfferId,
                startAt,
                endAt,
                status: 'PENDING',
                initiator: 'CUSTOMER',
                customerMessage: customerMessage ?? null,
            });

            await transaction
                .update(bookingRequestOffers)
                .set({ cookUnreadNotificationCount: row.offer.cookUnreadNotificationCount + 1 })
                .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId));

            await transaction.insert(bookingRequestOfferEvents).values({
                bookingRequestOfferEventId,
                bookingRequestOfferId,
                type: 'USER_CALL_SLOT_REQUESTED',
                payload: {
                    cookCallSlotBookingId,
                    startAt: startAt.toISOString(),
                    endAt: endAt.toISOString(),
                    ...(customerMessage ? { customerMessage } : {}),
                },
            });
        });

        await bookingRequestOfferCallSlotsCompleteSchedule(serverRuntime, {
            cookCallSlotBookingId,
            endAt,
            status: 'PENDING',
        });

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId }),
            serverRuntime.publish.userUpdates({ userId: row.offer.cookId }),
            serverRuntime.publish.adminUpdates(),
            bookingRequestOfferCallSlotRequestEmailSend(serverRuntime, {
                cookCallSlotBookingId,
                recipient: 'COOK',
            }),
        ]);

        await slackNotifyCallSlotEvent(serverRuntime, {
            bookingRequestId: row.bookingRequest.bookingRequestId,
            bookingRequestOfferId,
            action: 'requested',
            actor: 'customer',
            startAt: matched.startAt,
        });

        return { success: true, referenceId: cookCallSlotBookingId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
