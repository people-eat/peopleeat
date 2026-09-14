import { and, eq } from 'drizzle-orm';

import type { BookingRequest } from '../db/schema';
import { bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

/** Load a booking request owned by `userId`, or null. */
export async function userBookingRequestOwnedFindOne(
    serverRuntime: ServerRuntime,
    userId: string,
    bookingRequestId: string,
): Promise<BookingRequest | null> {
    const [row] = await serverRuntime.db
        .select()
        .from(bookingRequests)
        .where(and(eq(bookingRequests.bookingRequestId, bookingRequestId), eq(bookingRequests.userId, userId)))
        .limit(1);
    return row ?? null;
}
