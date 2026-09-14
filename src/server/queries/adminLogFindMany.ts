import { logs } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminLog, GqlSAdminLogsArgs, GqlSSession } from '../graphql/generated';
import { toGqlAdminLog } from '../mappers/toGqlAdminLog';
import { adminLogCriterionWhere } from '../utils/adminLogCriterionWhere';
import { adminLogOrderBy } from '../utils/adminLogOrderBy';
import { findManySkip, findManyTake } from '../utils/findManyTake';

export async function adminLogFindMany(
    args: GqlSAdminLogsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminLog[]> {
    try {
        const criterion = args.criterion;
        const where = adminLogCriterionWhere(criterion);
        if (where === false) {
            return [];
        }

        const rows = await serverRuntime.db
            .select()
            .from(logs)
            .where(where)
            .orderBy(adminLogOrderBy(criterion))
            .limit(findManyTake(criterion.take))
            .offset(findManySkip(criterion.skip));

        return rows.map(toGqlAdminLog);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
