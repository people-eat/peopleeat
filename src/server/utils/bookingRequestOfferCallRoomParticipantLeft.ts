import { eq } from 'drizzle-orm';

import { bookingRequestOfferCallRoomParticipants } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
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
}
