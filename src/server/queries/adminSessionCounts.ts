import { count } from 'drizzle-orm';

import { sessions } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminSessionCountsArgs, GqlSAdminSessionCriterion, GqlSSession } from '../graphql/generated';
import { adminSessionCriterionWhere } from '../utils/adminSessionCriterionWhere';

const ADMIN_COUNTS_CRITERIA_MAX = 20;

async function adminSessionCountOne(criterion: GqlSAdminSessionCriterion, serverRuntime: ServerRuntime): Promise<number> {
    const where = adminSessionCriterionWhere(criterion);
    if (where === false) {
        return 0;
    }

    const [row] = await serverRuntime.db.select({ value: count() }).from(sessions).where(where);
    return row?.value ?? 0;
}

export async function adminSessionCounts(
    args: GqlSAdminSessionCountsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<number[]> {
    try {
        const { criteria } = args;
        if (criteria.length === 0) {
            throw new Error('adminSessionCounts: criteria must not be empty');
        }
        if (criteria.length > ADMIN_COUNTS_CRITERIA_MAX) {
            throw new Error('adminSessionCounts: too many criteria');
        }

        return await Promise.all(criteria.map((criterion) => adminSessionCountOne(criterion, serverRuntime)));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
