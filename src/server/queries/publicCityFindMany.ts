import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSPublicCity } from '../graphql/generated';
import { toGqlPublicCity } from '../mappers/toGqlCity';
import { publicPublishedCitiesFindMany } from '../utils/contentPageFind';

export async function publicCityFindMany(serverRuntime: ServerRuntime): Promise<GqlSPublicCity[]> {
    const rows = await publicPublishedCitiesFindMany(serverRuntime.db);
    return rows.map(toGqlPublicCity);
}
