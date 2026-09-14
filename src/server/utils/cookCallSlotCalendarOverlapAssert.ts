import { and, eq, gt, inArray, lt, ne } from 'drizzle-orm';

import type { Database } from '../db';
import { cookCallSlotBookings } from '../db/schema';

/**
 * Throws when the cook already has a PENDING or CONFIRMED booking that overlaps
 * `[startAt, endAt)` on their calendar (any offer).
 */
export async function cookCallSlotCalendarOverlapAssert(
    db: Database,
    args: { cookId: string; startAt: Date; endAt: Date; excludeCookCallSlotBookingId?: string },
): Promise<void> {
    const [conflict] = await db
        .select({ cookCallSlotBookingId: cookCallSlotBookings.cookCallSlotBookingId })
        .from(cookCallSlotBookings)
        .where(
            and(
                eq(cookCallSlotBookings.cookId, args.cookId),
                inArray(cookCallSlotBookings.status, ['PENDING', 'CONFIRMED']),
                lt(cookCallSlotBookings.startAt, args.endAt),
                gt(cookCallSlotBookings.endAt, args.startAt),
                args.excludeCookCallSlotBookingId
                    ? ne(cookCallSlotBookings.cookCallSlotBookingId, args.excludeCookCallSlotBookingId)
                    : undefined,
            ),
        )
        .limit(1);

    if (conflict) {
        throw new Error('cookCallSlotCalendarOverlapAssert: overlapping PENDING/CONFIRMED booking');
    }
}
