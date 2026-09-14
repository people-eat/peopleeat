import { and, asc, eq, inArray } from 'drizzle-orm';

import { cooks, occasionCooks, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSPublicCook, GqlSPublicOccasion } from '../graphql/generated';
import { publicCookListedWhere } from '../utils/publicCookFindManyCriterionWhere';
import { publicCooksByIdFindMany } from '../utils/publicCookHydrate';

/** Curated occasion cooks that pass the public listing gate, in assignment order. Empty when none assigned. */
export async function occasionFeaturedCooksFindMany(parent: GqlSPublicOccasion, serverRuntime: ServerRuntime): Promise<GqlSPublicCook[]> {
    const assigned = await serverRuntime.db
        .select({ cookId: occasionCooks.cookId })
        .from(occasionCooks)
        .where(eq(occasionCooks.occasionId, parent.occasionId))
        .orderBy(asc(occasionCooks.position));

    if (assigned.length === 0) return [];

    const cookIds = assigned.map((row) => row.cookId);
    const listed = await serverRuntime.db
        .select({ cookId: cooks.cookId })
        .from(cooks)
        .innerJoin(users, eq(users.userId, cooks.cookId))
        .where(and(inArray(cooks.cookId, cookIds), publicCookListedWhere(serverRuntime.db)));
    const listedIds = new Set(listed.map((row) => row.cookId));

    const byId = await publicCooksByIdFindMany(serverRuntime.db, cookIds);
    return cookIds.flatMap((cookId) => {
        if (!listedIds.has(cookId)) return [];
        const cook = byId.get(cookId);
        return cook ? [cook] : [];
    });
}
