import { eq } from 'drizzle-orm';

import { bookingRequestOfferCallRoomParticipants, bookingRequestOfferCallRooms, bookingRequestOffers, bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { offerCallActorFromIds, slackNotifyCallRoomEvent } from '../slack/slackNotifyCallSlot';
import { bookingRequestOfferCallRoomEndIfEmpty } from './bookingRequestOfferCallRoomEndIfEmpty';

/**
 * Marks a participant as left. Ends the room when no active participants remain.
 */
export async function bookingRequestOfferCallRoomParticipantLeft(
    serverRuntime: ServerRuntime,
    bookingRequestOfferCallRoomParticipantId: string,
    options?: { actingUserId?: string },
): Promise<void> {
    const [participant] = await serverRuntime.db
        .select()
        .from(bookingRequestOfferCallRoomParticipants)
        .where(
            eq(bookingRequestOfferCallRoomParticipants.bookingRequestOfferCallRoomParticipantId, bookingRequestOfferCallRoomParticipantId),
        )
        .limit(1);

    if (!participant || participant.leftAt) {
        return;
    }

    if (options?.actingUserId && participant.userId !== options.actingUserId) {
        throw new Error('bookingRequestOfferCallRoomParticipantLeft: participant not owned by actor');
    }

    await serverRuntime.db
        .update(bookingRequestOfferCallRoomParticipants)
        .set({ leftAt: new Date() })
        .where(
            eq(bookingRequestOfferCallRoomParticipants.bookingRequestOfferCallRoomParticipantId, bookingRequestOfferCallRoomParticipantId),
        );

    await bookingRequestOfferCallRoomEndIfEmpty(serverRuntime, participant.bookingRequestOfferCallRoomId);

    const [offerRow] = await serverRuntime.db
        .select({
            bookingRequestId: bookingRequests.bookingRequestId,
            bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId,
            customerUserId: bookingRequests.userId,
            cookUserId: bookingRequestOffers.cookId,
        })
        .from(bookingRequestOfferCallRooms)
        .innerJoin(bookingRequestOffers, eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferCallRooms.bookingRequestOfferId))
        .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
        .where(eq(bookingRequestOfferCallRooms.bookingRequestOfferCallRoomId, participant.bookingRequestOfferCallRoomId))
        .limit(1);

    if (offerRow) {
        await slackNotifyCallRoomEvent(serverRuntime, {
            bookingRequestId: offerRow.bookingRequestId,
            bookingRequestOfferId: offerRow.bookingRequestOfferId,
            action: 'left',
            actor: offerCallActorFromIds({
                actingUserId: participant.userId,
                customerUserId: offerRow.customerUserId,
                cookUserId: offerRow.cookUserId,
            }),
        });
    }
}
