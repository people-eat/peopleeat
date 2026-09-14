import { count } from 'drizzle-orm';

import { outboundEmails } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminOutboundEmailCriterion, GqlSAdminOutboundEmailsCountsArgs, GqlSSession } from '../graphql/generated';
import { adminOutboundEmailCriterionWhere } from '../utils/adminOutboundEmailCriterionWhere';

const ADMIN_COUNTS_CRITERIA_MAX = 20;

async function adminOutboundEmailCountOne(criterion: GqlSAdminOutboundEmailCriterion, serverRuntime: ServerRuntime): Promise<number> {
    const where = adminOutboundEmailCriterionWhere(criterion);
    if (where === false) {
        return 0;
    }

    const [row] = await serverRuntime.db.select({ value: count() }).from(outboundEmails).where(where);
    return row?.value ?? 0;
}

export async function adminOutboundEmailCounts(
    args: GqlSAdminOutboundEmailsCountsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<number[]> {
    try {
        const { criteria } = args;
        if (criteria.length === 0) {
            throw new Error('adminOutboundEmailCounts: criteria must not be empty');
        }
        if (criteria.length > ADMIN_COUNTS_CRITERIA_MAX) {
            throw new Error('adminOutboundEmailCounts: too many criteria');
        }

        return await Promise.all(criteria.map((criterion) => adminOutboundEmailCountOne(criterion, serverRuntime)));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
