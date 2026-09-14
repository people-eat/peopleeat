import { eq } from 'drizzle-orm';

import { supportRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession, GqlSUserBookingRequest, GqlSUserSupportRequest } from '../graphql/generated';
import { toGqlUserSupportRequest } from '../mappers/toGqlUserSupportRequest';
import { supportRequestBookingSummariesById } from '../utils/supportRequestBookingSummariesById';

export async function userBookingRequestSupportRequestFindOne(
    parent: GqlSUserBookingRequest,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSUserSupportRequest | null> {
    if (!requestingSession.userId || requestingSession.userId !== parent.userId) {
        return null;
    }

    try {
        const [row] = await serverRuntime.db
            .select()
            .from(supportRequests)
            .where(eq(supportRequests.bookingRequestId, parent.bookingRequestId))
            .limit(1);

        if (!row) {
            return null;
        }

        const bookingById = await supportRequestBookingSummariesById([row], serverRuntime);
        return toGqlUserSupportRequest(row, row.bookingRequestId ? (bookingById.get(row.bookingRequestId) ?? null) : null);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
