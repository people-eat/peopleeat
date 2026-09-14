import { eq } from 'drizzle-orm';

import { cooks, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCity, GqlSAdminCook } from '../graphql/generated';
import { toGqlAdminCook } from '../mappers/toGqlAdminCook';
import { cookIsInTravelRadius } from '../utils/cookIsInTravelRadius';
import { publicCookListedWhere } from '../utils/publicCookFindManyCriterionWhere';

/** Public-eligible cooks whose travel radius covers the city center (admin candidate pool). */
export async function cityCooksInTravelRadiusFindMany(parent: GqlSAdminCity, serverRuntime: ServerRuntime): Promise<GqlSAdminCook[]> {
    const eventLocation = { latitude: parent.latitude, longitude: parent.longitude };
    const rows = await serverRuntime.db
        .select({ cook: cooks })
        .from(cooks)
        .innerJoin(users, eq(users.userId, cooks.cookId))
        .where(publicCookListedWhere(serverRuntime.db));

    return rows.filter((row) => cookIsInTravelRadius(row.cook, eventLocation)).map((row) => toGqlAdminCook(row.cook, 'ACTIVE'));
}
