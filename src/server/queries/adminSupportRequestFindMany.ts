import { desc, eq, sql } from 'drizzle-orm';

import { supportRequests, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminSupportRequest, GqlSAdminSupportRequestsArgs, GqlSSession } from '../graphql/generated';
import { toGqlAdminSupportRequest } from '../mappers/toGqlAdminSupportRequest';
import { toGqlAdminUser } from '../mappers/toGqlAdminUser';
import { adminSupportRequestCriterionWhere } from '../utils/adminSupportRequestCriterionWhere';
import { adminUserTypesByUserIdFindMany } from '../utils/adminUserTypesByUserIdFindMany';
import { findManySkip, findManyTake } from '../utils/findManyTake';
import { supportRequestBookingSummariesById } from '../utils/supportRequestBookingSummariesById';

export async function adminSupportRequestFindMany(
    args: GqlSAdminSupportRequestsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminSupportRequest[]> {
    try {
        const criterion = args.criterion;
        const where = adminSupportRequestCriterionWhere(criterion);

        const joined = await serverRuntime.db
            .select({
                supportRequest: supportRequests,
                user: users,
            })
            .from(supportRequests)
            .innerJoin(users, eq(users.userId, supportRequests.userId))
            .where(where)
            .orderBy(desc(sql`${supportRequests.adminUnreadNotificationCount} > 0`), desc(supportRequests.createdAt))
            .limit(findManyTake(criterion.take))
            .offset(findManySkip(criterion.skip));

        const typesByUserId = await adminUserTypesByUserIdFindMany(
            joined.map((row) => row.user.userId),
            serverRuntime.db,
        );
        const bookingById = await supportRequestBookingSummariesById(
            joined.map((row) => row.supportRequest),
            serverRuntime,
        );

        return joined.map(({ supportRequest, user }) =>
            toGqlAdminSupportRequest(
                supportRequest,
                toGqlAdminUser(user, typesByUserId.get(user.userId) ?? ['customer']),
                supportRequest.bookingRequestId ? (bookingById.get(supportRequest.bookingRequestId) ?? null) : null,
            ),
        );
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
