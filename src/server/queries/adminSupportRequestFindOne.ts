import { eq } from 'drizzle-orm';

import { supportRequests, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminSupportRequest, GqlSAdminSupportRequestArgs, GqlSSession } from '../graphql/generated';
import { toGqlAdminSupportRequest } from '../mappers/toGqlAdminSupportRequest';
import { toGqlAdminUser } from '../mappers/toGqlAdminUser';
import { adminUserTypesByUserIdFindMany } from '../utils/adminUserTypesByUserIdFindMany';
import { supportRequestBookingSummariesById } from '../utils/supportRequestBookingSummariesById';

export async function adminSupportRequestFindOne(
    args: GqlSAdminSupportRequestArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminSupportRequest | null> {
    try {
        const [joined] = await serverRuntime.db
            .select({
                supportRequest: supportRequests,
                user: users,
            })
            .from(supportRequests)
            .innerJoin(users, eq(users.userId, supportRequests.userId))
            .where(eq(supportRequests.supportRequestId, args.supportRequestId))
            .limit(1);

        if (!joined) {
            return null;
        }

        const typesByUserId = await adminUserTypesByUserIdFindMany([joined.user.userId], serverRuntime.db);
        const bookingById = await supportRequestBookingSummariesById([joined.supportRequest], serverRuntime);

        return toGqlAdminSupportRequest(
            joined.supportRequest,
            toGqlAdminUser(joined.user, typesByUserId.get(joined.user.userId) ?? ['customer']),
            joined.supportRequest.bookingRequestId ? (bookingById.get(joined.supportRequest.bookingRequestId) ?? null) : null,
        );
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
