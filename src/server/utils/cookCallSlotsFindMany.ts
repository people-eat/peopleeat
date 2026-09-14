import { and, eq, gte, inArray, lt } from 'drizzle-orm';

import { COOK_CALL_AVAILABILITY_TIME_ZONE, deriveCookCallSlots } from '../../shared/deriveCookCallSlots';
import type { DerivedCallSlot } from '../../shared/deriveCookCallSlots';
import type { Database } from '../db';
import { cookCallAvailabilityExceptions, cookCallAvailabilityRules, cookCallSlotBookings, cooks, users } from '../db/schema';

const MAX_SLOT_RANGE_MS = 60 * 24 * 60 * 60_000;

export async function cookCallSlotsFindMany(
    db: Database,
    args: { cookId: string; from: Date; to: Date; now?: Date },
): Promise<DerivedCallSlot[]> {
    const { cookId, from, to, now } = args;
    if (from >= to) {
        return [];
    }
    if (to.getTime() - from.getTime() > MAX_SLOT_RANGE_MS) {
        throw new Error('cookCallSlotsFindMany: range exceeds 60 days');
    }

    const [cook] = await db
        .select({
            callSchedulingEnabled: cooks.callSchedulingEnabled,
            callDurationMinutes: cooks.callDurationMinutes,
            timeZone: users.timeZone,
        })
        .from(cooks)
        .innerJoin(users, eq(users.userId, cooks.cookId))
        .where(eq(cooks.cookId, cookId))
        .limit(1);

    if (!cook || !cook.callSchedulingEnabled) {
        return [];
    }

    const [rules, exceptions, bookings] = await Promise.all([
        db.select().from(cookCallAvailabilityRules).where(eq(cookCallAvailabilityRules.cookId, cookId)),
        db.select().from(cookCallAvailabilityExceptions).where(eq(cookCallAvailabilityExceptions.cookId, cookId)),
        db
            .select({
                startAt: cookCallSlotBookings.startAt,
                endAt: cookCallSlotBookings.endAt,
                status: cookCallSlotBookings.status,
            })
            .from(cookCallSlotBookings)
            .where(
                and(
                    eq(cookCallSlotBookings.cookId, cookId),
                    inArray(cookCallSlotBookings.status, ['PENDING', 'CONFIRMED']),
                    gte(cookCallSlotBookings.endAt, from),
                    lt(cookCallSlotBookings.startAt, to),
                ),
            ),
    ]);

    return deriveCookCallSlots({
        callDurationMinutes: cook.callDurationMinutes,
        rules,
        exceptions: exceptions.map((row) => ({
            date: row.date,
            type: row.type,
            startMinuteOfDay: row.startMinuteOfDay,
            endMinuteOfDay: row.endMinuteOfDay,
        })),
        bookings,
        from,
        to,
        now,
        timeZone: cook.timeZone || COOK_CALL_AVAILABILITY_TIME_ZONE,
    });
}
