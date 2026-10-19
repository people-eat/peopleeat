import { and, eq, sql } from 'drizzle-orm';

import type { GeoCoordinates } from '../../shared/geoDistance';
import { bookingRequestCooks } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { travelDistanceKmResolve } from './travelDistanceKmResolve';

/**
 * Returns the cook↔request travel distance in km, preferring a stored
 * `BookingRequestCooks.travelDistanceKm`. When missing, resolves via Google
 * Routes (haversine fallback) and stamps the affinity row.
 *
 * Call on first open so pool/create UI shows the same distance offer create locks.
 */
export async function bookingRequestCookTravelDistanceKmEnsure(
    serverRuntime: ServerRuntime,
    input: {
        cookId: string;
        bookingRequestId: string;
        origin: GeoCoordinates;
        destination: GeoCoordinates;
        /** Skip the DB read when the caller already loaded the affinity row. */
        existingTravelDistanceKm?: number | null;
    },
): Promise<number> {
    const stored =
        input.existingTravelDistanceKm !== undefined
            ? input.existingTravelDistanceKm
            : ((
                  await serverRuntime.db
                      .select({ travelDistanceKm: bookingRequestCooks.travelDistanceKm })
                      .from(bookingRequestCooks)
                      .where(
                          and(
                              eq(bookingRequestCooks.cookId, input.cookId),
                              eq(bookingRequestCooks.bookingRequestId, input.bookingRequestId),
                          ),
                      )
                      .limit(1)
              )[0]?.travelDistanceKm ?? null);

    if (stored != null && Number.isFinite(stored) && stored >= 0) {
        return stored;
    }

    const travelDistanceKm = await travelDistanceKmResolve(serverRuntime.places, input.origin, input.destination);

    await serverRuntime.db
        .insert(bookingRequestCooks)
        .values({
            cookId: input.cookId,
            bookingRequestId: input.bookingRequestId,
            menuEvaluationLoading: false,
            travelDistanceKm,
        })
        .onConflictDoUpdate({
            target: [bookingRequestCooks.cookId, bookingRequestCooks.bookingRequestId],
            set: {
                travelDistanceKm: sql`COALESCE(${bookingRequestCooks.travelDistanceKm}, ${travelDistanceKm})`,
            },
        });

    const [after] = await serverRuntime.db
        .select({ travelDistanceKm: bookingRequestCooks.travelDistanceKm })
        .from(bookingRequestCooks)
        .where(and(eq(bookingRequestCooks.cookId, input.cookId), eq(bookingRequestCooks.bookingRequestId, input.bookingRequestId)))
        .limit(1);

    return after?.travelDistanceKm ?? travelDistanceKm;
}

/** Clears stamped travel distances so the next open / offer create re-resolves. */
export async function bookingRequestCookTravelDistanceKmClear(
    serverRuntime: ServerRuntime,
    criterion: { bookingRequestId: string } | { cookId: string },
): Promise<void> {
    if ('bookingRequestId' in criterion) {
        await serverRuntime.db
            .update(bookingRequestCooks)
            .set({ travelDistanceKm: null })
            .where(eq(bookingRequestCooks.bookingRequestId, criterion.bookingRequestId));
        return;
    }

    await serverRuntime.db
        .update(bookingRequestCooks)
        .set({ travelDistanceKm: null })
        .where(eq(bookingRequestCooks.cookId, criterion.cookId));
}
