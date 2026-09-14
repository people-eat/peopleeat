import { eq } from 'drizzle-orm';

import { cities } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCity, GqlSAdminCityArgs } from '../graphql/generated';
import { toGqlAdminCity } from '../mappers/toGqlCity';

export async function adminCityFindOne(args: GqlSAdminCityArgs, serverRuntime: ServerRuntime): Promise<GqlSAdminCity | null> {
    const [row] = await serverRuntime.db.select().from(cities).where(eq(cities.cityId, args.cityId)).limit(1);
    return row ? toGqlAdminCity(row) : null;
}
