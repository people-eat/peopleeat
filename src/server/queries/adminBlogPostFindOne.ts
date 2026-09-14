import { eq } from 'drizzle-orm';

import { blogPosts } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminBlogPost, GqlSAdminBlogPostArgs } from '../graphql/generated';
import { toGqlAdminBlogPost } from '../mappers/toGqlBlogPost';

export async function adminBlogPostFindOne(args: GqlSAdminBlogPostArgs, serverRuntime: ServerRuntime): Promise<GqlSAdminBlogPost | null> {
    const [row] = await serverRuntime.db.select().from(blogPosts).where(eq(blogPosts.blogPostId, args.blogPostId)).limit(1);
    return row ? toGqlAdminBlogPost(row) : null;
}
