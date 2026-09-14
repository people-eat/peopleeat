import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import type { BlogPostCreate } from '../db/schema';
import { blogPosts } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { publicBlogPostFindMany } from './publicBlogPostFindMany';
import { publicBlogPostFindOneByPathName } from './publicBlogPostFindOneByPathName';

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

describe('publicBlogPostFindMany', () => {
    it('includes published blog posts and excludes unpublished ones', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const published = await insertBlogPost({ publishedAt: new Date('2024-01-01T00:00:00.000Z') });
        const unpublished = await insertBlogPost({ publishedAt: null });

        // Act
        const rows = await publicBlogPostFindMany(serverRuntime);

        // Assert
        expect(rows.some((row) => row.blogPostId === published.blogPostId)).toBe(true);
        expect(rows.some((row) => row.blogPostId === unpublished.blogPostId)).toBe(false);
    });
});

describe('publicBlogPostFindOneByPathName', () => {
    it('returns the published blog post by its current path name', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const pathName = `published-post-${idCreate()}`;
        const post = await insertBlogPost({ pathName, publishedAt: new Date('2024-01-01T00:00:00.000Z') });

        // Act
        const row = await publicBlogPostFindOneByPathName({ pathName }, serverRuntime);

        // Assert
        expect(row).toMatchObject({ blogPostId: post.blogPostId, pathName });
    });

    it('returns null for an unpublished blog post path name', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const pathName = `draft-post-${idCreate()}`;
        await insertBlogPost({ pathName, publishedAt: null });

        // Act / Assert
        await expect(publicBlogPostFindOneByPathName({ pathName }, serverRuntime)).resolves.toBeNull();
    });

    it('returns null when the path name does not match any blog post', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();

        // Act / Assert
        await expect(publicBlogPostFindOneByPathName({ pathName: `no-such-path-${idCreate()}` }, serverRuntime)).resolves.toBeNull();
    });
});
