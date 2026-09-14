import { and, eq } from 'drizzle-orm';

import { supportRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession, GqlSUser, GqlSUserSupportRequest, GqlSUserSupportRequestArgs } from '../graphql/generated';
import { toGqlUserSupportRequest } from '../mappers/toGqlUserSupportRequest';
import { supportRequestBookingSummariesById } from '../utils/supportRequestBookingSummariesById';

export async function userSupportRequestFindOne(
    parentUser: GqlSUser,
    args: GqlSUserSupportRequestArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSUserSupportRequest | null> {
    if (!requestingSession.userId || requestingSession.userId !== parentUser.userId) {
        return null;
    }

    try {
        const [row] = await serverRuntime.db
            .select()
            .from(supportRequests)
            .where(and(eq(supportRequests.supportRequestId, args.supportRequestId), eq(supportRequests.userId, parentUser.userId)))
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
