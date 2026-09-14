import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSPublicBlogPost, GqlSPublicBlogPostQueryFindOneByPathNameArgs } from '../graphql/generated';
import { toGqlPublicBlogPost } from '../mappers/toGqlBlogPost';
import { blogPostFindByPathNameAny, contentIsPublished } from '../utils/contentPageFind';

export async function publicBlogPostFindOneByPathName(
    args: GqlSPublicBlogPostQueryFindOneByPathNameArgs,
    serverRuntime: ServerRuntime,
): Promise<GqlSPublicBlogPost | null> {
    const row = await blogPostFindByPathNameAny(serverRuntime.db, args.pathName);
    if (!row || !contentIsPublished(row.publishedAt)) return null;
    return toGqlPublicBlogPost(row);
}
