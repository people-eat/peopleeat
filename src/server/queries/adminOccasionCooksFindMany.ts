import { and, asc, eq, inArray } from 'drizzle-orm';

import { cooks, occasionCooks, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminOccasion, GqlSAdminOccasionCook } from '../graphql/generated';
import { toGqlAdminCook } from '../mappers/toGqlAdminCook';
import { publicCookListedWhere } from '../utils/publicCookFindManyCriterionWhere';

export async function adminOccasionCooksFindMany(
    parent: GqlSAdminOccasion,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminOccasionCook[]> {
    const assigned = await serverRuntime.db
        .select({ cookId: occasionCooks.cookId, position: occasionCooks.position })
        .from(occasionCooks)
        .where(eq(occasionCooks.occasionId, parent.occasionId))
        .orderBy(asc(occasionCooks.position));

    if (assigned.length === 0) return [];

    const cookIds = assigned.map((row) => row.cookId);
    const cookRows = await serverRuntime.db
        .select({ cook: cooks, status: users.status })
        .from(cooks)
        .innerJoin(users, eq(users.userId, cooks.cookId))
        .where(inArray(cooks.cookId, cookIds));
    const cooksById = new Map(cookRows.map((row) => [row.cook.cookId, row]));

    const listed = await serverRuntime.db
        .select({ cookId: cooks.cookId })
        .from(cooks)
        .innerJoin(users, eq(users.userId, cooks.cookId))
        .where(and(inArray(cooks.cookId, cookIds), publicCookListedWhere(serverRuntime.db)));
    const listedIds = new Set(listed.map((row) => row.cookId));

    return assigned.flatMap((row) => {
        const matched = cooksById.get(row.cookId);
        if (!matched) return [];
        return [
            {
                position: row.position,
                cook: toGqlAdminCook(matched.cook, matched.status),
                isPubliclyListed: listedIds.has(row.cookId),
            },
        ];
    });
}
