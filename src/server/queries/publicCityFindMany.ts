import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSPublicCity, GqlSPublicCityQueryFindManyArgs } from '../graphql/generated';
import { toGqlPublicCity } from '../mappers/toGqlCity';
import { publicCitiesFindMany } from '../utils/contentPageFind';

export async function publicCityFindMany(
    args: GqlSPublicCityQueryFindManyArgs | undefined,
    serverRuntime: ServerRuntime,
): Promise<GqlSPublicCity[]> {
    const rows = await publicCitiesFindMany(serverRuntime.db, args?.countryCode ?? null);
    return rows.map(toGqlPublicCity);
}
