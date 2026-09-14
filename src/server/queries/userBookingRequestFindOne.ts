import { and, eq } from 'drizzle-orm';

import { bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession, GqlSUser, GqlSUserBookingRequest, GqlSUserBookingRequestArgs } from '../graphql/generated';
import { userBookingRequestHydrate } from '../utils/userBookingRequestHydrate';

export async function userBookingRequestFindOne(
    parentUser: GqlSUser,
    args: GqlSUserBookingRequestArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSUserBookingRequest | null> {
    if (!requestingSession.userId || requestingSession.userId !== parentUser.userId) {
        return null;
    }

    try {
        const [bookingRequest] = await serverRuntime.db
            .select()
            .from(bookingRequests)
            .where(and(eq(bookingRequests.bookingRequestId, args.bookingRequestId), eq(bookingRequests.userId, parentUser.userId)))
            .limit(1);

        if (!bookingRequest) {
            return null;
        }

        const [hydrated] = await userBookingRequestHydrate([bookingRequest], serverRuntime);
        return hydrated ?? null;
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
