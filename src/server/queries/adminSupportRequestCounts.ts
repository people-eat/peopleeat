import { count } from 'drizzle-orm';

import { supportRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminSupportRequestCriterion, GqlSAdminSupportRequestsCountsArgs, GqlSSession } from '../graphql/generated';
import { adminSupportRequestCriterionWhere } from '../utils/adminSupportRequestCriterionWhere';

const ADMIN_COUNTS_CRITERIA_MAX = 20;

async function adminSupportRequestCountOne(criterion: GqlSAdminSupportRequestCriterion, serverRuntime: ServerRuntime): Promise<number> {
    const where = adminSupportRequestCriterionWhere(criterion, serverRuntime.db);
    const [row] = await serverRuntime.db.select({ value: count() }).from(supportRequests).where(where);
    return row?.value ?? 0;
}

export async function adminSupportRequestCounts(
    args: GqlSAdminSupportRequestsCountsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<number[]> {
    try {
        const { criteria } = args;
        if (criteria.length === 0) {
            throw new Error('adminSupportRequestCounts: criteria must not be empty');
        }
        if (criteria.length > ADMIN_COUNTS_CRITERIA_MAX) {
            throw new Error('adminSupportRequestCounts: too many criteria');
        }

        return await Promise.all(criteria.map((criterion) => adminSupportRequestCountOne(criterion, serverRuntime)));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
