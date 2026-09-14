import { count } from 'drizzle-orm';

import { promoCodes } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminPromoCodeCriterion, GqlSAdminPromoCodesCountsArgs, GqlSSession } from '../graphql/generated';
import { adminPromoCodeCriterionWhere } from '../utils/adminPromoCodeCriterionWhere';

const ADMIN_COUNTS_CRITERIA_MAX = 20;

async function adminPromoCodeCountOne(criterion: GqlSAdminPromoCodeCriterion, serverRuntime: ServerRuntime): Promise<number> {
    const where = adminPromoCodeCriterionWhere(criterion);
    const [row] = await serverRuntime.db.select({ value: count() }).from(promoCodes).where(where);
    return row?.value ?? 0;
}

export async function adminPromoCodeCounts(
    args: GqlSAdminPromoCodesCountsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<number[]> {
    try {
        const { criteria } = args;
        if (criteria.length === 0) {
            throw new Error('adminPromoCodeCounts: criteria must not be empty');
        }
        if (criteria.length > ADMIN_COUNTS_CRITERIA_MAX) {
            throw new Error('adminPromoCodeCounts: too many criteria');
        }

        return await Promise.all(criteria.map((criterion) => adminPromoCodeCountOne(criterion, serverRuntime)));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
