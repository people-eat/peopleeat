import { and, asc, eq, inArray } from 'drizzle-orm';

import { cooks, partnerVenueCooks, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSPublicCook, GqlSPublicPartnerVenue } from '../graphql/generated';
import { publicCookListedWhere } from '../utils/publicCookFindManyCriterionWhere';
import { publicCooksByIdFindMany } from '../utils/publicCookHydrate';

/** Curated venue cooks that pass the public listing gate, in assignment order. Empty when none assigned. */
export async function partnerVenueFeaturedCooksFindMany(
    parent: GqlSPublicPartnerVenue,
    serverRuntime: ServerRuntime,
): Promise<GqlSPublicCook[]> {
    const assigned = await serverRuntime.db
        .select({ cookId: partnerVenueCooks.cookId })
        .from(partnerVenueCooks)
        .where(eq(partnerVenueCooks.partnerVenueId, parent.partnerVenueId))
        .orderBy(asc(partnerVenueCooks.position));

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
