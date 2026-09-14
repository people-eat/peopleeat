import { and, eq } from 'drizzle-orm';

import type { Database } from '../db';
import type { BookingRequestOfferCallRoom } from '../db/schema';
import { bookingRequestOfferCallRooms } from '../db/schema';

export async function bookingRequestOfferCallRoomFindActive(
    db: Database,
    bookingRequestOfferId: string,
): Promise<BookingRequestOfferCallRoom | null> {
    const [room] = await db
        .select()
        .from(bookingRequestOfferCallRooms)
        .where(
            and(
                eq(bookingRequestOfferCallRooms.bookingRequestOfferId, bookingRequestOfferId),
                eq(bookingRequestOfferCallRooms.status, 'ACTIVE'),
            ),
        )
        .limit(1);

    return room ?? null;
}
