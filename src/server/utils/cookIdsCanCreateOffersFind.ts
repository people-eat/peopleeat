import { eq, sql } from 'drizzle-orm';

import type { GeoCoordinates } from '../../shared/geoDistance';
import { bookingRequestCooks, cooks, users } from '../db/schema';
import type { BookingRequestCookRequestedMenu } from '../domain/bookingRequest';
import { cookCanCreateOffersDerive } from '../domain/cook';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { cookIsInTravelRadius } from './cookIsInTravelRadius';

/**
 * Cooks who can create offers and whose travel radius covers `eventLocation` (haversine).
 * Eligibility matches `canCreateOffers` (ACTIVE + admin-approved + Stripe completed).
 * Not gated on `isVisible`. Excludes the customer user when provided.
 * Used by create/notify to stamp `BookingRequestCooks`.
 */
export async function cookIdsCanCreateOffersFind(
    serverRuntime: ServerRuntime,
    eventLocation: GeoCoordinates,
    options?: { excludeUserId?: string },
): Promise<string[]> {
    const rows = await serverRuntime.db
        .select({ cook: cooks, status: users.status })
        .from(cooks)
        .innerJoin(users, eq(users.userId, cooks.cookId));

    return rows
        .filter(
            ({ cook, status }) =>
                cookCanCreateOffersDerive(cook, status) &&
                cookIsInTravelRadius(cook, eventLocation) &&
                cook.cookId !== options?.excludeUserId,
        )
        .map(({ cook }) => cook.cookId);
}

/** Upsert notify stamp on the cook↔request affinity row. `requestedMenu` is insert-only. */
export async function bookingRequestCookNotifiedUpsert(
    serverRuntime: ServerRuntime,
    input: {
        cookId: string;
        bookingRequestId: string;
        notifiedAt?: Date;
        requestedMenu?: BookingRequestCookRequestedMenu | null;
    },
): Promise<void> {
    const notifiedAt = input.notifiedAt ?? new Date();
    const requestedMenu = input.requestedMenu ?? null;
    await serverRuntime.db
        .insert(bookingRequestCooks)
        .values({
            cookId: input.cookId,
            bookingRequestId: input.bookingRequestId,
            menuEvaluationLoading: false,
            notifiedAt,
            requestedMenuId: requestedMenu?.menuId ?? null,
            requestedMenu,
        })
        .onConflictDoUpdate({
            target: [bookingRequestCooks.cookId, bookingRequestCooks.bookingRequestId],
            set: {
                notifiedAt: sql`COALESCE(${bookingRequestCooks.notifiedAt}, ${notifiedAt})`,
            },
        });
}
