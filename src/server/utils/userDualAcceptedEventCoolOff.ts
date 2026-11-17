import { and, desc, eq, or } from 'drizzle-orm';

import { bookingRequestOffers, bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';

/** Seven days after the last dual-accepted event (or after request) before delete/ban. */
export const USER_ACCOUNT_DELETION_COOL_OFF_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Latest dual-accepted booking-request event datetime for this user as customer
 * or cook. Null when none exist.
 */
export async function userLastDualAcceptedEventDateTimeFind(userId: string, serverRuntime: ServerRuntime): Promise<Date | null> {
    const [row] = await serverRuntime.db
        .select({ dateTime: bookingRequests.dateTime })
        .from(bookingRequests)
        .innerJoin(bookingRequestOffers, eq(bookingRequestOffers.bookingRequestId, bookingRequests.bookingRequestId))
        .where(
            and(
                eq(bookingRequestOffers.userAccepted, true),
                eq(bookingRequestOffers.cookAccepted, true),
                or(eq(bookingRequests.userId, userId), eq(bookingRequestOffers.cookId, userId)),
            ),
        )
        .orderBy(desc(bookingRequests.dateTime))
        .limit(1);

    return row?.dateTime ?? null;
}

/** `max(now + 7d, lastDualAcceptedEvent + 7d)`. */
export function userAccountDeletionScheduledForResolve(now: Date, lastDualAcceptedEventDateTime: Date | null): Date {
    const fromNow = new Date(now.getTime() + USER_ACCOUNT_DELETION_COOL_OFF_MS);
    if (lastDualAcceptedEventDateTime == null) {
        return fromNow;
    }
    const fromEvent = new Date(lastDualAcceptedEventDateTime.getTime() + USER_ACCOUNT_DELETION_COOL_OFF_MS);
    return fromEvent.getTime() > fromNow.getTime() ? fromEvent : fromNow;
}

/**
 * Throws when a dual-accepted event is still upcoming or within the 7-day
 * post-event window. Used for admin IMMEDIATE anonymize and ban.
 */
export async function userDualAcceptedEventCoolOffAssert(userId: string, serverRuntime: ServerRuntime, commandName: string): Promise<void> {
    const last = await userLastDualAcceptedEventDateTimeFind(userId, serverRuntime);
    if (last != null && last.getTime() > Date.now() - USER_ACCOUNT_DELETION_COOL_OFF_MS) {
        throw new Error(`${commandName}: dual-accepted event cool-off`);
    }
}
