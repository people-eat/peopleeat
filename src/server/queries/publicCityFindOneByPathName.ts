import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSPublicCity, GqlSPublicCityQueryFindOneByPathNameArgs } from '../graphql/generated';
import { toGqlPublicCity } from '../mappers/toGqlCity';
import { cityFindByPathNameAny, contentIsPublished } from '../utils/contentPageFind';

export async function publicCityFindOneByPathName(
    args: GqlSPublicCityQueryFindOneByPathNameArgs,
    serverRuntime: ServerRuntime,
): Promise<GqlSPublicCity | null> {
    const row = await cityFindByPathNameAny(serverRuntime.db, args.pathName);
    if (!row || !contentIsPublished(row.publishedAt)) return null;
    return toGqlPublicCity(row);
}
