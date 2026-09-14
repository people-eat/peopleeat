import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, blogPosts } from '../db/schema';
import { adminMutationParent, commandSetup, findLogsForSession, testDb } from '../test/commandTestUtils';
import { adminBlogPostDelete } from './adminBlogPostDelete';

describe('adminBlogPostDelete', () => {
    it('deletes the blog post and publishes adminUpdates', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'blog-delete-admin', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const blogPostId = idCreate();
        await testDb.insert(blogPosts).values({
            blogPostId,
            pathName: `delete-post-${blogPostId.slice(0, 8)}`,
            titleDe: 'Titel',
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            sections: [],
        });

        // Act
        const result = await adminBlogPostDelete(
            adminMutationParent(admin.user.userId),
            { blogPostId },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: blogPostId });
        const rows = await testDb.select().from(blogPosts).where(eq(blogPosts.blogPostId, blogPostId));
        expect(rows).toHaveLength(0);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('throws when the blog post is missing, logs the error, and does not publish', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'blog-delete-missing', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const blogPostId = idCreate();

        // Act + Assert
        await expect(
            adminBlogPostDelete(adminMutationParent(admin.user.userId), { blogPostId }, admin.requestingSession, admin.serverRuntime),
        ).rejects.toThrow(/blog post not found/);

        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.level).toBe('error');
        expect(logRows[0]!.message).toMatch(/blog post not found/);
    });
});
