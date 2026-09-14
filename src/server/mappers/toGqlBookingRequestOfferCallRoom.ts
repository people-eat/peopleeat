import type { BookingRequestOfferCallRoom } from '../db/schema';
import type { GqlSBookingRequestOfferCallRoom } from '../graphql/generated';

export function toGqlBookingRequestOfferCallRoom(row: BookingRequestOfferCallRoom): GqlSBookingRequestOfferCallRoom {
    return {
        bookingRequestOfferCallRoomId: row.bookingRequestOfferCallRoomId,
        bookingRequestOfferId: row.bookingRequestOfferId,
        livekitRoomName: row.livekitRoomName,
        status: row.status,
        createdByUserId: row.createdByUserId,
        startedAt: row.startedAt,
        endedAt: row.endedAt ?? null,
    };
}
