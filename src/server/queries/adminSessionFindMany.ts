import { eq } from 'drizzle-orm';

import { sessions, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminSession, GqlSAdminSessionsArgs, GqlSSession } from '../graphql/generated';
import { toGqlAdminSession } from '../mappers/toGqlAdminSession';
import { adminSessionCriterionWhere } from '../utils/adminSessionCriterionWhere';
import { adminSessionOrderBy, adminSessionOrderByNeedsUserJoin } from '../utils/adminSessionOrderBy';
import { findManySkip, findManyTake } from '../utils/findManyTake';

export async function adminSessionFindMany(
    args: GqlSAdminSessionsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminSession[]> {
    try {
        const criterion = args.criterion;
        const where = adminSessionCriterionWhere(criterion);
        if (where === false) {
            return [];
        }

        const orderBy = adminSessionOrderBy(criterion);
        const take = findManyTake(criterion.take);
        const skip = findManySkip(criterion.skip);

        if (adminSessionOrderByNeedsUserJoin(criterion)) {
            const rows = await serverRuntime.db
                .select({ session: sessions })
                .from(sessions)
                .leftJoin(users, eq(sessions.userId, users.userId))
                .where(where)
                .orderBy(orderBy)
                .limit(take)
                .offset(skip);

            return rows.map((row) => toGqlAdminSession(row.session));
        }

        const rows = await serverRuntime.db.select().from(sessions).where(where).orderBy(orderBy).limit(take).offset(skip);

        return rows.map(toGqlAdminSession);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
