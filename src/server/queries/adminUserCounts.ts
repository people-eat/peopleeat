import { count } from 'drizzle-orm';

import { users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminUserCountsArgs, GqlSAdminUserCriterion, GqlSSession } from '../graphql/generated';
import { adminUserCriterionWhere } from '../utils/adminUserCriterionWhere';

const ADMIN_COUNTS_CRITERIA_MAX = 20;

async function adminUserCountOne(criterion: GqlSAdminUserCriterion, serverRuntime: ServerRuntime): Promise<number> {
    const where = adminUserCriterionWhere(criterion, serverRuntime.db);
    if (where === false) {
        return 0;
    }

    const [row] = await serverRuntime.db.select({ value: count() }).from(users).where(where);
    return row?.value ?? 0;
}

export async function adminUserCounts(
    args: GqlSAdminUserCountsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<number[]> {
    try {
        const { criteria } = args;
        if (criteria.length === 0) {
            throw new Error('adminUserCounts: criteria must not be empty');
        }
        if (criteria.length > ADMIN_COUNTS_CRITERIA_MAX) {
            throw new Error('adminUserCounts: too many criteria');
        }

        return await Promise.all(criteria.map((criterion) => adminUserCountOne(criterion, serverRuntime)));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
