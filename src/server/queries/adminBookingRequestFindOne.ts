import { eq } from 'drizzle-orm';

import { bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminBookingRequest, GqlSAdminBookingRequestArgs, GqlSSession } from '../graphql/generated';
import { adminBookingRequestHydrate } from '../utils/adminBookingRequestHydrate';
import { userLocaleRequire } from '../utils/userLocaleRequire';

export async function adminBookingRequestFindOne(
    args: GqlSAdminBookingRequestArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminBookingRequest | null> {
    try {
        if (!requestingSession.userId) {
            throw new Error('adminBookingRequestFindOne: requesting session has no userId');
        }
        const locale = await userLocaleRequire(serverRuntime, requestingSession.userId);
        const [bookingRequest] = await serverRuntime.db
            .select()
            .from(bookingRequests)
            .where(eq(bookingRequests.bookingRequestId, args.bookingRequestId))
            .limit(1);
        if (!bookingRequest) return null;
        const [hydrated] = await adminBookingRequestHydrate([bookingRequest], serverRuntime, locale);
        return hydrated ?? null;
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
