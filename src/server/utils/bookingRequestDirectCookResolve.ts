import { eq } from 'drizzle-orm';

import { cooks, users } from '../db/schema';
import { cookCanReceiveDirectBookingRequests } from '../domain/cook';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { featureToggleIsEnabled } from './featureToggleIsEnabled';

/**
 * Honors a chef-page `requestedCookId` only when the entry toggle is on and the
 * cook can receive exclusive requests. Otherwise null (marketplace create).
 */
export async function bookingRequestDirectCookResolve(
    serverRuntime: ServerRuntime,
    input: { requestedCookId: string | null | undefined; customerUserId: string },
): Promise<{ cookId: string } | null> {
    const requestedCookId = input.requestedCookId?.trim() || null;
    if (!requestedCookId || requestedCookId === input.customerUserId) {
        return null;
    }

    const enabled = await featureToggleIsEnabled('BOOKING_REQUEST_COOK_DIRECT', serverRuntime, input.customerUserId);
    if (!enabled) {
        return null;
    }

    const [row] = await serverRuntime.db
        .select({ cook: cooks, status: users.status })
        .from(cooks)
        .innerJoin(users, eq(users.userId, cooks.cookId))
        .where(eq(cooks.cookId, requestedCookId))
        .limit(1);

    if (!row || !cookCanReceiveDirectBookingRequests(row.cook, row.status)) {
        return null;
    }

    return { cookId: row.cook.cookId };
}
