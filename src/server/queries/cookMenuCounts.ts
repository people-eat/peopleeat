import { count } from 'drizzle-orm';

import { menus } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCook, GqlSCookMenuCriterion, GqlSCookMenusCountsArgs, GqlSSession } from '../graphql/generated';
import { cookMenuCriterionWhere } from '../utils/cookMenuCriterionWhere';

const COOK_COUNTS_CRITERIA_MAX = 20;

async function cookMenuCountOne(cookId: string, criterion: GqlSCookMenuCriterion, serverRuntime: ServerRuntime): Promise<number> {
    const where = cookMenuCriterionWhere(cookId, criterion);

    const [row] = await serverRuntime.db.select({ value: count() }).from(menus).where(where);

    return row?.value ?? 0;
}

export async function cookMenuCounts(
    { cookId }: GqlSCook,
    args: GqlSCookMenusCountsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<number[]> {
    try {
        const { criteria } = args;
        if (criteria.length === 0) {
            throw new Error('cookMenuCounts: criteria must not be empty');
        }
        if (criteria.length > COOK_COUNTS_CRITERIA_MAX) {
            throw new Error('cookMenuCounts: too many criteria');
        }

        return await Promise.all(criteria.map((criterion) => cookMenuCountOne(cookId, criterion, serverRuntime)));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
