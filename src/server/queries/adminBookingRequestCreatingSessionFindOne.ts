import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminSession } from '../graphql/generated';
import { adminBookingRequestCreatingSessionsByRequestIdFind } from '../utils/adminBookingRequestCreatingSessionsByRequestIdFind';

/**
 * Creating browser session for an admin booking request, via the earliest
 * `BOOKING_REQUEST_CREATED` event whose payload includes `bookingRequestId`.
 * Null when none (admin-created, imported predecessor empty payload, missing).
 */
export async function adminBookingRequestCreatingSessionFindOne(
    bookingRequestId: string,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminSession | null> {
    const sessionsByRequestId = await adminBookingRequestCreatingSessionsByRequestIdFind([bookingRequestId], serverRuntime);
    return sessionsByRequestId.get(bookingRequestId) ?? null;
}
