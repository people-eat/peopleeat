import { count } from 'drizzle-orm';

import { logs } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminLogCountsArgs, GqlSAdminLogCriterion, GqlSSession } from '../graphql/generated';
import { adminLogCriterionWhere } from '../utils/adminLogCriterionWhere';

const ADMIN_COUNTS_CRITERIA_MAX = 20;

async function adminLogCountOne(criterion: GqlSAdminLogCriterion, serverRuntime: ServerRuntime): Promise<number> {
    const where = adminLogCriterionWhere(criterion);
    if (where === false) {
        return 0;
    }

    const [row] = await serverRuntime.db.select({ value: count() }).from(logs).where(where);
    return row?.value ?? 0;
}

export async function adminLogCounts(
    args: GqlSAdminLogCountsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<number[]> {
    try {
        const { criteria } = args;
        if (criteria.length === 0) {
            throw new Error('adminLogCounts: criteria must not be empty');
        }
        if (criteria.length > ADMIN_COUNTS_CRITERIA_MAX) {
            throw new Error('adminLogCounts: too many criteria');
        }

        return await Promise.all(criteria.map((criterion) => adminLogCountOne(criterion, serverRuntime)));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
