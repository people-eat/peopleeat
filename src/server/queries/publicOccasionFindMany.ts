import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSPublicOccasion } from '../graphql/generated';
import { toGqlPublicOccasion } from '../mappers/toGqlOccasion';
import { publicPublishedOccasionsFindMany } from '../utils/contentPageFind';

export async function publicOccasionFindMany(serverRuntime: ServerRuntime): Promise<GqlSPublicOccasion[]> {
    const rows = await publicPublishedOccasionsFindMany(serverRuntime.db);
    return rows.map(toGqlPublicOccasion);
}
