import { count } from 'drizzle-orm';

import { giftCards } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminGiftCardCriterion, GqlSAdminGiftCardsCountsArgs, GqlSSession } from '../graphql/generated';
import { adminGiftCardCriterionWhere } from '../utils/adminGiftCardCriterionWhere';

const ADMIN_COUNTS_CRITERIA_MAX = 20;

async function adminGiftCardCountOne(criterion: GqlSAdminGiftCardCriterion, serverRuntime: ServerRuntime): Promise<number> {
    const where = adminGiftCardCriterionWhere(criterion);
    if (where === false) {
        return 0;
    }

    const [row] = await serverRuntime.db.select({ value: count() }).from(giftCards).where(where);
    return row?.value ?? 0;
}

export async function adminGiftCardCounts(
    args: GqlSAdminGiftCardsCountsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<number[]> {
    try {
        const { criteria } = args;
        if (criteria.length === 0) {
            throw new Error('adminGiftCardCounts: criteria must not be empty');
        }
        if (criteria.length > ADMIN_COUNTS_CRITERIA_MAX) {
            throw new Error('adminGiftCardCounts: too many criteria');
        }

        return await Promise.all(criteria.map((criterion) => adminGiftCardCountOne(criterion, serverRuntime)));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
