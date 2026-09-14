import { desc, eq } from 'drizzle-orm';

import { bookingRequestOfferCallRecordings, bookingRequestOfferCallRooms } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminBookingRequestOffer, GqlSBookingRequestOfferCallRecording, GqlSSession } from '../graphql/generated';
import { toGqlBookingRequestOfferCallRecording } from '../mappers/toGqlBookingRequestOfferCallRecording';

/**
 * Admin-only list of call recordings (audio + transcript) for an offer.
 */
export async function adminBookingRequestOfferCallRecordingsFindMany(
    parent: GqlSAdminBookingRequestOffer,
    _requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSBookingRequestOfferCallRecording[]> {
    const rows = await serverRuntime.db
        .select({ recording: bookingRequestOfferCallRecordings })
        .from(bookingRequestOfferCallRecordings)
        .innerJoin(
            bookingRequestOfferCallRooms,
            eq(bookingRequestOfferCallRooms.bookingRequestOfferCallRoomId, bookingRequestOfferCallRecordings.bookingRequestOfferCallRoomId),
        )
        .where(eq(bookingRequestOfferCallRooms.bookingRequestOfferId, parent.bookingRequestOfferId))
        .orderBy(desc(bookingRequestOfferCallRecordings.createdAt));

    return rows.map(({ recording }) => toGqlBookingRequestOfferCallRecording(recording));
}
