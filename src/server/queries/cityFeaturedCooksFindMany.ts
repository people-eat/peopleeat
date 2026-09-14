import { and, asc, eq, inArray } from 'drizzle-orm';

import { cityCooks, cooks, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSPublicCity, GqlSPublicCook } from '../graphql/generated';
import { publicCookListedWhere } from '../utils/publicCookFindManyCriterionWhere';
import { publicCooksByIdFindMany } from '../utils/publicCookHydrate';
import { publicCookFindMany } from './publicCookFindMany';

/**
 * Curated city cooks that pass the public listing gate, in assignment order.
 * When no CityCooks rows exist, falls back to travel-radius discovery at the
 * city center (same gate as `/chefs`).
 */
export async function cityFeaturedCooksFindMany(parent: GqlSPublicCity, serverRuntime: ServerRuntime): Promise<GqlSPublicCook[]> {
    const assigned = await serverRuntime.db
        .select({ cookId: cityCooks.cookId, position: cityCooks.position })
        .from(cityCooks)
        .where(eq(cityCooks.cityId, parent.cityId))
        .orderBy(asc(cityCooks.position));

    if (assigned.length === 0) {
        return publicCookFindMany(
            { criterion: { geoCoordinates: { latitude: parent.latitude, longitude: parent.longitude } } },
            serverRuntime,
        );
    }

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
