import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import type { BlogPostCreate } from '../db/schema';
import { blogPosts } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminBlogPostFindMany } from './adminBlogPostFindMany';
import { adminBlogPostFindOne } from './adminBlogPostFindOne';

async function insertBlogPost(overrides: Partial<BlogPostCreate> = {}) {
    const blogPostId = overrides.blogPostId ?? idCreate();
    const [row] = await testDb
        .insert(blogPosts)
        .values({
            blogPostId,
            pathName: `blog-post-${blogPostId}`,
            titleDe: 'Titel',
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            sections: [],
            ...overrides,
        })
        .returning();
    if (!row) throw new Error('insertBlogPost: insert returned no rows');
    return row;
}

describe('adminBlogPostFindMany', () => {
    it('returns seeded blog posts ordered by updatedAt descending', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const older = await insertBlogPost({ titleDe: 'older-post', updatedAt: new Date('2024-01-01T00:00:00.000Z') });
        const newer = await insertBlogPost({ titleDe: 'newer-post', updatedAt: new Date('2024-06-01T00:00:00.000Z') });

        // Act
        const rows = await adminBlogPostFindMany(serverRuntime);

        // Assert
        const olderIdx = rows.findIndex((row) => row.blogPostId === older.blogPostId);
        const newerIdx = rows.findIndex((row) => row.blogPostId === newer.blogPostId);
        expect(olderIdx).toBeGreaterThanOrEqual(0);
        expect(newerIdx).toBeGreaterThanOrEqual(0);
        expect(newerIdx).toBeLessThan(olderIdx);
        expect(rows[newerIdx]).toMatchObject({ blogPostId: newer.blogPostId, titleDe: 'newer-post' });
    });
});

describe('adminBlogPostFindOne', () => {
    it('returns the mapped blog post row', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const post = await insertBlogPost({ titleDe: 'detail-post' });

        // Act
        const row = await adminBlogPostFindOne({ blogPostId: post.blogPostId }, serverRuntime);

        // Assert
        expect(row).toMatchObject({
            blogPostId: post.blogPostId,
            pathName: post.pathName,
            titleDe: 'detail-post',
        });
    });

    it('returns null when the blog post id is unknown', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();

        // Act / Assert
        await expect(adminBlogPostFindOne({ blogPostId: idCreate() }, serverRuntime)).resolves.toBeNull();
    });
});
