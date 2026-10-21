import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import {
    bookingRequestOfferCallRecordings,
    bookingRequestOfferCallRooms,
    bookingRequestOffers,
    bookingRequests,
    users,
} from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCall, GqlSAdminCallArgs, GqlSSession } from '../graphql/generated';
import { toGqlBookingRequestOfferCallRecording } from '../mappers/toGqlBookingRequestOfferCallRecording';

export async function adminCallFindOne(
    args: GqlSAdminCallArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminCall | null> {
    try {
        const cookUsers = alias(users, 'cookUsers');
        const customerUsers = alias(users, 'customerUsers');

        const [row] = await serverRuntime.db
            .select({
                room: bookingRequestOfferCallRooms,
                recording: bookingRequestOfferCallRecordings,
                bookingRequestId: bookingRequests.bookingRequestId,
                bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId,
                cookId: bookingRequestOffers.cookId,
                customerUserId: bookingRequests.userId,
                cookDisplayName: cookUsers.firstName,
                customerDisplayName: customerUsers.firstName,
                occasion: bookingRequests.occasion,
            })
            .from(bookingRequestOfferCallRooms)
            .innerJoin(
                bookingRequestOffers,
                eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferCallRooms.bookingRequestOfferId),
            )
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .innerJoin(cookUsers, eq(cookUsers.userId, bookingRequestOffers.cookId))
            .innerJoin(customerUsers, eq(customerUsers.userId, bookingRequests.userId))
            .leftJoin(
                bookingRequestOfferCallRecordings,
                eq(
                    bookingRequestOfferCallRecordings.bookingRequestOfferCallRoomId,
                    bookingRequestOfferCallRooms.bookingRequestOfferCallRoomId,
                ),
            )
            .where(eq(bookingRequestOfferCallRooms.bookingRequestOfferCallRoomId, args.bookingRequestOfferCallRoomId))
            .limit(1);

        if (!row) {
            return null;
        }

        return {
            bookingRequestOfferCallRoomId: row.room.bookingRequestOfferCallRoomId,
            bookingRequestOfferId: row.bookingRequestOfferId,
            bookingRequestId: row.bookingRequestId,
            livekitRoomName: row.room.livekitRoomName,
            status: row.room.status,
            startedAt: row.room.startedAt,
            endedAt: row.room.endedAt ?? null,
            occasion: row.occasion,
            cookId: row.cookId,
            customerUserId: row.customerUserId,
            cookDisplayName: row.cookDisplayName,
            customerDisplayName: row.customerDisplayName,
            recording: row.recording ? toGqlBookingRequestOfferCallRecording(row.recording) : null,
        };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
