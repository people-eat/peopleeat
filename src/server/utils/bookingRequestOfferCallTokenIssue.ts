import { and, eq, isNull, ne } from 'drizzle-orm';

import { isCallJoinable } from '../../shared/callJoinWindow';
import { idCreate } from '../../shared/idCreate';
import {
    bookingRequestOfferCallRoomParticipants,
    bookingRequestOfferCallRooms,
    bookingRequestOffers,
    bookingRequests,
    cookCallSlotBookings,
    users,
} from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSBookingRequestOfferCallTokenResult } from '../graphql/generated';
import { bookingRequestOfferCallRecordingStart } from './bookingRequestOfferCallRecordingStart';
import { bookingRequestOfferCallWritableAssert } from './bookingRequestOfferCallWritableAssert';

export type BookingRequestOfferCallIssueMode = 'create' | 'join';

/**
 * Shared LiveKit token issue after role authz. `create` starts a room when none
 * is ACTIVE; `join` requires an existing ACTIVE room.
 */
export async function bookingRequestOfferCallTokenIssue(
    serverRuntime: ServerRuntime,
    args: {
        bookingRequestOfferId: string;
        actingUserId: string;
        sessionId: string;
        mode: BookingRequestOfferCallIssueMode;
    },
): Promise<GqlSBookingRequestOfferCallTokenResult> {
    const { bookingRequestOfferId, actingUserId, sessionId, mode } = args;

    const [row] = await serverRuntime.db
        .select({ offer: bookingRequestOffers, bookingRequest: bookingRequests })
        .from(bookingRequestOffers)
        .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
        .where(eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferId))
        .limit(1);

    if (!row) {
        throw new Error('bookingRequestOfferCallTokenIssue: offer not found');
    }

    bookingRequestOfferCallWritableAssert({ offer: row.offer, bookingRequest: row.bookingRequest });

    const [user] = await serverRuntime.db.select({ firstName: users.firstName }).from(users).where(eq(users.userId, actingUserId)).limit(1);

    let [room] = await serverRuntime.db
        .select()
        .from(bookingRequestOfferCallRooms)
        .where(
            and(
                eq(bookingRequestOfferCallRooms.bookingRequestOfferId, bookingRequestOfferId),
                eq(bookingRequestOfferCallRooms.status, 'ACTIVE'),
            ),
        )
        .limit(1);

    if (!room && mode === 'join') {
        throw new Error('bookingRequestOfferCallTokenIssue: no active call room');
    }

    if (!room) {
        const prefix = serverRuntime.livekit.roomPrefix();
        const shortId = idCreate().replace(/-/g, '').slice(0, 8);
        const livekitRoomName = `${prefix}-offer-${bookingRequestOfferId}-${shortId}`;
        const bookingRequestOfferCallRoomId = idCreate();

        await serverRuntime.livekit.roomService().createRoom({
            name: livekitRoomName,
            emptyTimeout: 60,
            departureTimeout: 30,
        });

        await serverRuntime.db.insert(bookingRequestOfferCallRooms).values({
            bookingRequestOfferCallRoomId,
            bookingRequestOfferId,
            livekitRoomName,
            status: 'ACTIVE',
            createdByUserId: actingUserId,
        });

        const [created] = await serverRuntime.db
            .select()
            .from(bookingRequestOfferCallRooms)
            .where(eq(bookingRequestOfferCallRooms.bookingRequestOfferCallRoomId, bookingRequestOfferCallRoomId))
            .limit(1);
        room = created!;

        // Do not await — LiveKit egress can hang (e.g. unreachable S3) and would
        // abort the GraphQL call-create. Recording is best-effort.
        void bookingRequestOfferCallRecordingStart(serverRuntime, {
            bookingRequestOfferCallRoomId,
            livekitRoomName,
        });

        const slotRows = await serverRuntime.db
            .select()
            .from(cookCallSlotBookings)
            .where(
                and(
                    eq(cookCallSlotBookings.bookingRequestOfferId, bookingRequestOfferId),
                    eq(cookCallSlotBookings.status, 'CONFIRMED'),
                    isNull(cookCallSlotBookings.videoCallRoomId),
                ),
            );

        const joinable = slotRows.find((booking) => isCallJoinable(booking));
        if (joinable) {
            await serverRuntime.db
                .update(cookCallSlotBookings)
                .set({ videoCallRoomId: bookingRequestOfferCallRoomId, lastModifiedAt: new Date() })
                .where(eq(cookCallSlotBookings.cookCallSlotBookingId, joinable.cookCallSlotBookingId));
        }
    }

    const bookingRequestOfferCallRoomParticipantId = idCreate();
    await serverRuntime.db.insert(bookingRequestOfferCallRoomParticipants).values({
        bookingRequestOfferCallRoomParticipantId,
        bookingRequestOfferCallRoomId: room.bookingRequestOfferCallRoomId,
        sessionId,
        userId: actingUserId,
    });

    // Close prior open rows for this session on this room (re-join). The new
    // participant row above keeps the room active.
    await serverRuntime.db
        .update(bookingRequestOfferCallRoomParticipants)
        .set({ leftAt: new Date() })
        .where(
            and(
                eq(bookingRequestOfferCallRoomParticipants.bookingRequestOfferCallRoomId, room.bookingRequestOfferCallRoomId),
                eq(bookingRequestOfferCallRoomParticipants.sessionId, sessionId),
                isNull(bookingRequestOfferCallRoomParticipants.leftAt),
                ne(
                    bookingRequestOfferCallRoomParticipants.bookingRequestOfferCallRoomParticipantId,
                    bookingRequestOfferCallRoomParticipantId,
                ),
            ),
        );

    const token = await serverRuntime.livekit.accessTokenCreate({
        identity: actingUserId,
        name: user?.firstName,
        roomName: room.livekitRoomName,
    });

    await Promise.all([
        serverRuntime.publish.userUpdates({ userId: row.bookingRequest.userId }),
        serverRuntime.publish.userUpdates({ userId: row.offer.cookId }),
        serverRuntime.publish.adminUpdates(),
    ]);

    return {
        token,
        url: serverRuntime.livekit.url(),
        bookingRequestOfferCallRoomParticipantId,
    };
}
