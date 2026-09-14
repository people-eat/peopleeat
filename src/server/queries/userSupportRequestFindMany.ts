import { desc, eq } from 'drizzle-orm';

import { supportRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession, GqlSUser, GqlSUserSupportRequest } from '../graphql/generated';
import { toGqlUserSupportRequest } from '../mappers/toGqlUserSupportRequest';
import { supportRequestBookingSummariesById } from '../utils/supportRequestBookingSummariesById';

export async function userSupportRequestFindMany(
    parentUser: GqlSUser,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSUserSupportRequest[] | null> {
    if (!requestingSession.userId || requestingSession.userId !== parentUser.userId) {
        return null;
    }

    try {
        const rows = await serverRuntime.db
            .select()
            .from(supportRequests)
            .where(eq(supportRequests.userId, parentUser.userId))
            .orderBy(desc(supportRequests.createdAt));

        const bookingById = await supportRequestBookingSummariesById(rows, serverRuntime);
        return rows.map((row) =>
            toGqlUserSupportRequest(row, row.bookingRequestId ? (bookingById.get(row.bookingRequestId) ?? null) : null),
        );
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
