import { eq } from 'drizzle-orm';

import { blogPosts } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationBlogPostDeleteArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';

export async function adminBlogPostDelete(
    { adminId }: GqlSAdminMutation,
    { blogPostId }: GqlSAdminMutationBlogPostDeleteArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(adminId, serverRuntime);

    try {
        const deleted = await serverRuntime.db
            .delete(blogPosts)
            .where(eq(blogPosts.blogPostId, blogPostId))
            .returning({ blogPostId: blogPosts.blogPostId });
        if (deleted.length === 0) {
            throw new Error('adminBlogPostDelete: blog post not found');
        }
        await serverRuntime.publish.adminUpdates();
        return { success: true, referenceId: blogPostId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
