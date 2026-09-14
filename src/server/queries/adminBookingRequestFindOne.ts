import { eq } from 'drizzle-orm';

import { bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminBookingRequest, GqlSAdminBookingRequestArgs, GqlSSession } from '../graphql/generated';
import { adminBookingRequestHydrate } from '../utils/adminBookingRequestHydrate';

export async function adminBookingRequestFindOne(
    args: GqlSAdminBookingRequestArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminBookingRequest | null> {
    try {
        const [bookingRequest] = await serverRuntime.db
            .select()
            .from(bookingRequests)
            .where(eq(bookingRequests.bookingRequestId, args.bookingRequestId))
            .limit(1);
        if (!bookingRequest) return null;
        const [hydrated] = await adminBookingRequestHydrate([bookingRequest], serverRuntime);
        return hydrated ?? null;
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
