import { and, eq, isNull, lt } from 'drizzle-orm';

import { bookingRequestOfferCallRoomParticipants, bookingRequestOfferCallRooms } from '../../db/schema';
import { bookingRequestOfferCallRoomEndIfEmpty } from '../../utils/bookingRequestOfferCallRoomEndIfEmpty';
import type { RecurringJobDefinition } from '../types';

const ROOM_SWEEP_MIN_AGE_MS = 90_000;

/**
 * Ends ACTIVE LiveKit rooms that have been empty for ≥90s (or whose LiveKit
 * room is already gone). Closes stale DB participant rows first so
 * `bookingRequestOfferCallRoomEndIfEmpty` can finish the room.
 */
export const bookingRequestOfferCallRoomsSweep: RecurringJobDefinition = {
    kind: 'recurring',
    name: 'booking-request-offer-call-rooms-sweep',
    cron: '* * * * *',
    handler: async ({ serverRuntime }) => {
        const cutoff = new Date(Date.now() - ROOM_SWEEP_MIN_AGE_MS);
        const rooms = await serverRuntime.db
            .select()
            .from(bookingRequestOfferCallRooms)
            .where(and(eq(bookingRequestOfferCallRooms.status, 'ACTIVE'), lt(bookingRequestOfferCallRooms.startedAt, cutoff)));

        if (rooms.length === 0) {
            return;
        }

        const roomService = serverRuntime.livekit.roomService();
        const now = new Date();

        for (const room of rooms) {
            let livekitEmpty = false;
            try {
                const participants = await roomService.listParticipants(room.livekitRoomName);
                livekitEmpty = participants.length === 0;
            } catch {
                // Room missing / unreachable — treat as empty.
                livekitEmpty = true;
            }

            if (!livekitEmpty) {
                continue;
            }

            await serverRuntime.db
                .update(bookingRequestOfferCallRoomParticipants)
                .set({ leftAt: now })
                .where(
                    and(
                        eq(bookingRequestOfferCallRoomParticipants.bookingRequestOfferCallRoomId, room.bookingRequestOfferCallRoomId),
                        isNull(bookingRequestOfferCallRoomParticipants.leftAt),
                    ),
                );

            await bookingRequestOfferCallRoomEndIfEmpty(serverRuntime, room.bookingRequestOfferCallRoomId);
        }
    },
    options: {
        retryLimit: 1,
        retryDelay: 30,
        expireInSeconds: 50,
    },
};
