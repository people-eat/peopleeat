import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { admins, blogPosts } from '../db/schema';
import type { GqlSBlogPostUpsert } from '../graphql/generated';
import { adminMutationParent, commandSetup, findLogsForSession, testDb } from '../test/commandTestUtils';
import { adminBlogPostUpsert } from './adminBlogPostUpsert';

function blogPostInput(overrides: Partial<GqlSBlogPostUpsert> = {}): GqlSBlogPostUpsert {
    const suffix = idCreate().slice(0, 8).toLowerCase();
    return {
        pathName: `blog-${suffix}`,
        titleDe: 'Titel',
        titleEn: 'Title',
        descriptionDe: 'Beschreibung',
        descriptionEn: 'Description',
        headlineDe: 'Headline DE',
        headlineEn: 'Headline EN',
        subHeadlineDe: 'Sub DE',
        subHeadlineEn: 'Sub EN',
        sections: [],
        ...overrides,
    };
}

describe('adminBlogPostUpsert', () => {
    it('inserts a new blog post and publishes adminUpdates', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'blog-upsert-create', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const publishedAt = new Date('2026-03-01T12:00:00.000Z');
        const input = blogPostInput({
            pathName: `  Create Post ${idCreate().slice(0, 8)}  `,
            titleDe: '  Titel  ',
            descriptionDe: '  Beschreibung  ',
            headlineDe: '  Headline  ',
            subHeadlineDe: '  Sub  ',
            publishedAt,
            sections: [
                {
                    sectionId: idCreate(),
                    kind: 'content',
                    bodyDe: 'Inhalt',
                    bodyEn: 'Body',
                },
            ],
        });

        // Act
        const result = await adminBlogPostUpsert(
            adminMutationParent(admin.user.userId),
            { input },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.referenceId).toBeTruthy();
        const [row] = await testDb.select().from(blogPosts).where(eq(blogPosts.blogPostId, result.referenceId!));
        expect(row).toMatchObject({
            titleDe: 'Titel',
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            titleEn: 'Title',
            previousPathNames: [],
        });
        expect(row?.pathName).toMatch(/^create-post-/);
        expect(row?.publishedAt?.getTime()).toBe(publishedAt.getTime());
        expect(row?.sections).toHaveLength(1);
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('updates an existing blog post and archives the previous pathName', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'blog-upsert-update', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const blogPostId = idCreate();
        const oldPath = `old-blog-${blogPostId.slice(0, 8).toLowerCase()}`;
        const newPath = `new-blog-${blogPostId.slice(0, 8).toLowerCase()}`;
        await testDb.insert(blogPosts).values({
            blogPostId,
            pathName: oldPath,
            previousPathNames: ['legacy-path'],
            titleDe: 'Alt',
            descriptionDe: 'Alt',
            headlineDe: 'Alt',
            subHeadlineDe: 'Alt',
            sections: [],
        });

        // Act
        const result = await adminBlogPostUpsert(
            adminMutationParent(admin.user.userId),
            { input: blogPostInput({ blogPostId, pathName: newPath, titleDe: 'Neu' }) },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        expect(result).toEqual({ success: true, referenceId: blogPostId });
        const [row] = await testDb.select().from(blogPosts).where(eq(blogPosts.blogPostId, blogPostId));
        expect(row?.pathName).toBe(newPath);
        expect(row?.titleDe).toBe('Neu');
        expect(row?.previousPathNames).toEqual(expect.arrayContaining(['legacy-path', oldPath]));
        expect(admin.serverRuntime.publish.adminUpdates).toHaveBeenCalledTimes(1);
    });

    it('keeps previousPathNames unchanged when the pathName is unchanged', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'blog-upsert-same-path', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const blogPostId = idCreate();
        const pathName = `same-blog-${blogPostId.slice(0, 8).toLowerCase()}`;
        await testDb.insert(blogPosts).values({
            blogPostId,
            pathName,
            previousPathNames: ['kept'],
            titleDe: 'Alt',
            descriptionDe: 'Alt',
            headlineDe: 'Alt',
            subHeadlineDe: 'Alt',
            sections: [],
        });

        // Act
        await adminBlogPostUpsert(
            adminMutationParent(admin.user.userId),
            { input: blogPostInput({ blogPostId, pathName, titleDe: 'Neu' }) },
            admin.requestingSession,
            admin.serverRuntime,
        );

        // Assert
        const [row] = await testDb.select().from(blogPosts).where(eq(blogPosts.blogPostId, blogPostId));
        expect(row?.previousPathNames).toEqual(['kept']);
        expect(row?.titleDe).toBe('Neu');
    });

    it('rejects empty German fields without writing or publishing', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'blog-upsert-empty-de', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        // Act + Assert
        await expect(
            adminBlogPostUpsert(
                adminMutationParent(admin.user.userId),
                { input: blogPostInput({ titleDe: '   ' }) },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/required German fields must not be empty/);

        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.level).toBe('error');
        expect(logRows[0]!.message).toMatch(/required German fields must not be empty/);
    });

    it('rejects an empty pathName without publishing', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'blog-upsert-empty-path', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        // Act + Assert
        await expect(
            adminBlogPostUpsert(
                adminMutationParent(admin.user.userId),
                { input: blogPostInput({ pathName: '   ' }) },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/pathName must not be empty/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.level).toBe('error');
    });

    it('rejects an unknown blogPostId without publishing', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'blog-upsert-missing', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });
        const blogPostId = idCreate();

        // Act + Assert
        await expect(
            adminBlogPostUpsert(
                adminMutationParent(admin.user.userId),
                { input: blogPostInput({ blogPostId }) },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/blog post not found/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.message).toMatch(/blog post not found/);
    });

    it('rejects invalid content sections without publishing', async () => {
        // Arrange
        const admin = await commandSetup.withUser({ firstName: 'blog-upsert-bad-sections', lastName: 'User' });
        await testDb.insert(admins).values({ adminId: admin.user.userId });

        // Act + Assert
        await expect(
            adminBlogPostUpsert(
                adminMutationParent(admin.user.userId),
                {
                    input: blogPostInput({
                        sections: [{ sectionId: idCreate(), kind: 'image' }],
                    }),
                },
                admin.requestingSession,
                admin.serverRuntime,
            ),
        ).rejects.toThrow(/Invalid content sections/);

        expect(admin.serverRuntime.publish.adminUpdates).not.toHaveBeenCalled();
        const logRows = await findLogsForSession(admin.requestingSession.sessionId);
        expect(logRows).toHaveLength(1);
        expect(logRows[0]!.message).toMatch(/Invalid content sections/);
    });
});
