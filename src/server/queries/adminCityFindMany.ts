import { desc } from 'drizzle-orm';

import { cities } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminCity } from '../graphql/generated';
import { toGqlAdminCity } from '../mappers/toGqlCity';

export async function adminCityFindMany(serverRuntime: ServerRuntime): Promise<GqlSAdminCity[]> {
    const rows = await serverRuntime.db.select().from(cities).orderBy(desc(cities.updatedAt));
    return rows.map(toGqlAdminCity);
}
