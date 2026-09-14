import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSPublicBlogPost } from '../graphql/generated';
import { toGqlPublicBlogPost } from '../mappers/toGqlBlogPost';
import { publicPublishedBlogPostsFindMany } from '../utils/contentPageFind';

export async function publicBlogPostFindMany(serverRuntime: ServerRuntime): Promise<GqlSPublicBlogPost[]> {
    const rows = await publicPublishedBlogPostsFindMany(serverRuntime.db);
    return rows.map(toGqlPublicBlogPost);
}
