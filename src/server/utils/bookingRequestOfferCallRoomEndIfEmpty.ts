import { and, eq, isNull } from 'drizzle-orm';

import { bookingRequestOfferCallRoomParticipants, bookingRequestOfferCallRooms, bookingRequestOffers, bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { bookingRequestOfferCallRecordingFinalizeEnqueue } from './bookingRequestOfferCallRecordingFinalizeEnqueue';

/**
 * Marks the room ENDED when no participants remain active. Best-effort LiveKit
 * `deleteRoom`. Publishes user + admin updates.
 */
export async function bookingRequestOfferCallRoomEndIfEmpty(
    serverRuntime: ServerRuntime,
    bookingRequestOfferCallRoomId: string,
): Promise<boolean> {
    const active = await serverRuntime.db
        .select({ id: bookingRequestOfferCallRoomParticipants.bookingRequestOfferCallRoomParticipantId })
        .from(bookingRequestOfferCallRoomParticipants)
        .where(
            and(
                eq(bookingRequestOfferCallRoomParticipants.bookingRequestOfferCallRoomId, bookingRequestOfferCallRoomId),
                isNull(bookingRequestOfferCallRoomParticipants.leftAt),
            ),
        )
        .limit(1);

    if (active.length > 0) {
        return false;
    }

    const [room] = await serverRuntime.db
        .select()
        .from(bookingRequestOfferCallRooms)
        .where(eq(bookingRequestOfferCallRooms.bookingRequestOfferCallRoomId, bookingRequestOfferCallRoomId))
        .limit(1);

    if (!room || room.status === 'ENDED') {
        return false;
    }

    const now = new Date();
    await serverRuntime.db
        .update(bookingRequestOfferCallRooms)
        .set({ status: 'ENDED', endedAt: now })
        .where(eq(bookingRequestOfferCallRooms.bookingRequestOfferCallRoomId, bookingRequestOfferCallRoomId));

    try {
        await serverRuntime.livekit.roomService().deleteRoom(room.livekitRoomName);
    } catch {
        // Room may already be gone after LiveKit emptyTimeout — ignore.
    }

    await bookingRequestOfferCallRecordingFinalizeEnqueue(serverRuntime, bookingRequestOfferCallRoomId);

    const [offerRow] = await serverRuntime.db
        .select({ userId: bookingRequests.userId, cookId: bookingRequestOffers.cookId })
        .from(bookingRequestOfferCallRooms)
        .innerJoin(bookingRequestOffers, eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferCallRooms.bookingRequestOfferId))
        .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
        .where(eq(bookingRequestOfferCallRooms.bookingRequestOfferCallRoomId, bookingRequestOfferCallRoomId))
        .limit(1);

    if (offerRow) {
        await Promise.all([
            serverRuntime.publish.userUpdates({ userId: offerRow.userId }),
            serverRuntime.publish.userUpdates({ userId: offerRow.cookId }),
            serverRuntime.publish.adminUpdates(),
        ]);
    } else {
        await serverRuntime.publish.adminUpdates();
    }

    return true;
}
