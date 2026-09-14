import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSPublicOccasion, GqlSPublicOccasionQueryFindOneByPathNameArgs } from '../graphql/generated';
import { toGqlPublicOccasion } from '../mappers/toGqlOccasion';
import { contentIsPublished, occasionFindByPathNameAny } from '../utils/contentPageFind';

export async function publicOccasionFindOneByPathName(
    args: GqlSPublicOccasionQueryFindOneByPathNameArgs,
    serverRuntime: ServerRuntime,
): Promise<GqlSPublicOccasion | null> {
    const row = await occasionFindByPathNameAny(serverRuntime.db, args.pathName);
    if (!row || !contentIsPublished(row.publishedAt)) return null;
    return toGqlPublicOccasion(row);
}
