import { desc } from 'drizzle-orm';

import { blogPosts } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminBlogPost } from '../graphql/generated';
import { toGqlAdminBlogPost } from '../mappers/toGqlBlogPost';

export async function adminBlogPostFindMany(serverRuntime: ServerRuntime): Promise<GqlSAdminBlogPost[]> {
    const rows = await serverRuntime.db.select().from(blogPosts).orderBy(desc(blogPosts.updatedAt));
    return rows.map(toGqlAdminBlogPost);
}
