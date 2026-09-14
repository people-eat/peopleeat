import type { BookingRequestParticipant } from '../db/schema';
import type { GqlSBookingRequestParticipant } from '../graphql/generated';

export function toGqlBookingRequestParticipant(row: BookingRequestParticipant): GqlSBookingRequestParticipant {
    return {
        bookingRequestParticipantId: row.bookingRequestParticipantId,
        type: row.type,
        name: row.name,
        restrictions: row.restrictions,
        createdAt: row.createdAt,
    };
}
