import { desc, eq } from 'drizzle-orm';

import { bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession, GqlSUser, GqlSUserBookingRequest } from '../graphql/generated';
import { userBookingRequestHydrate } from '../utils/userBookingRequestHydrate';

export async function userBookingRequestFindMany(
    parentUser: GqlSUser,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSUserBookingRequest[] | null> {
    if (!requestingSession.userId || requestingSession.userId !== parentUser.userId) {
        return null;
    }

    try {
        const rows = await serverRuntime.db
            .select()
            .from(bookingRequests)
            .where(eq(bookingRequests.userId, parentUser.userId))
            .orderBy(desc(bookingRequests.createdAt));

        return userBookingRequestHydrate(rows, serverRuntime);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
