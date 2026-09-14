import { count, eq } from 'drizzle-orm';

import { menus, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCookMenuCriterion, GqlSAdminCookMenusCountsArgs, GqlSSession } from '../graphql/generated';
import { adminCookMenuCriterionWhere } from '../utils/adminCookMenuCriterionWhere';

const ADMIN_COUNTS_CRITERIA_MAX = 20;

async function adminCookMenuCountOne(criterion: GqlSAdminCookMenuCriterion, serverRuntime: ServerRuntime): Promise<number> {
    const where = adminCookMenuCriterionWhere(criterion);

    const [row] = await serverRuntime.db
        .select({ value: count() })
        .from(menus)
        .innerJoin(users, eq(users.userId, menus.cookId))
        .where(where);

    return row?.value ?? 0;
}

export async function adminCookMenuCounts(
    args: GqlSAdminCookMenusCountsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<number[]> {
    try {
        const { criteria } = args;
        if (criteria.length === 0) {
            throw new Error('adminCookMenuCounts: criteria must not be empty');
        }
        if (criteria.length > ADMIN_COUNTS_CRITERIA_MAX) {
            throw new Error('adminCookMenuCounts: too many criteria');
        }

        return await Promise.all(criteria.map((criterion) => adminCookMenuCountOne(criterion, serverRuntime)));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
