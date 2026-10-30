import { eq } from 'drizzle-orm';

import type { BookingRequest } from '../db/schema';
import { bookingRequestCooks, cooks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { cookIsEligibleForBookingRequestPool } from './cookBookingRequestPoolEligibility';

type BookingRequestPoolSnapshot = Pick<BookingRequest, 'bookingRequestId' | 'userId' | 'publicationStatus' | 'exactEventAddress'>;

/**
 * Cooks whose open pool can contain this request (same rule as the pool list
 * and `Cook.attentionCounts`). Ignores canceled / expired / offer state, so it
 * also finds cooks whose pool just lost the request.
 */
export async function bookingRequestPoolCookIdsFind(
    serverRuntime: ServerRuntime,
    bookingRequest: BookingRequestPoolSnapshot,
): Promise<string[]> {
    const [cookRows, affinityRows] = await Promise.all([
        serverRuntime.db.select().from(cooks),
        serverRuntime.db
            .select({ cookId: bookingRequestCooks.cookId, notifiedAt: bookingRequestCooks.notifiedAt })
            .from(bookingRequestCooks)
            .where(eq(bookingRequestCooks.bookingRequestId, bookingRequest.bookingRequestId)),
    ]);
    const affinityByCookId = new Map(affinityRows.map((row) => [row.cookId, row]));

    return cookRows
        .filter((cook) => cookIsEligibleForBookingRequestPool(cook, bookingRequest, affinityByCookId.get(cook.cookId) ?? null))
        .map((cook) => cook.cookId);
}

/**
 * Publish `userUpdates` to every cook whose pool gains or loses a request.
 * Pass several snapshots when pool membership itself moved (e.g. old and new
 * event address). `alreadyPublishedUserIds` are skipped to avoid double pushes.
 */
export async function bookingRequestPoolCooksPublish(
    serverRuntime: ServerRuntime,
    snapshots: BookingRequestPoolSnapshot[],
    alreadyPublishedUserIds: Iterable<string> = [],
): Promise<void> {
    const skip = new Set(alreadyPublishedUserIds);
    const cookIdLists = await Promise.all(snapshots.map((snapshot) => bookingRequestPoolCookIdsFind(serverRuntime, snapshot)));
    const cookIds = [...new Set(cookIdLists.flat())].filter((cookId) => !skip.has(cookId));
    await Promise.all(cookIds.map((cookId) => serverRuntime.publish.userUpdates({ userId: cookId })));
}
