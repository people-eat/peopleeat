import { describe, expect, it } from 'vitest';

import { LLMS_PAGE_BLURBS, llmsTxtBuild } from './llmsTxtBuild';
import { SITEMAP_PATHS } from './sitemapRoutes';

describe('llmsTxtBuild', () => {
    it('has a sentence for every static sitemap path', () => {
        // Arrange — nothing
        // Act
        const paths = SITEMAP_PATHS.map((entry) => entry.path).sort();

        // Assert
        expect(Object.keys(LLMS_PAGE_BLURBS).sort()).toEqual(paths);
    });

    it('lists real cities and chefs in English and skips empty groups', () => {
        // Arrange — nothing
        // Act
        const body = llmsTxtBuild({
            webPageUrl: 'https://example.com',
            cities: [{ path: '/cities/berlin', title: 'Berlin', description: 'Chefs who cook in Berlin.' }],
            occasions: [],
            posts: [],
            chefs: [{ cookId: 'cook-1', displayName: 'Anna', city: 'Berlin' }],
        });

        // Assert
        expect(body).toContain('[Berlin](https://example.com/en/cities/berlin): Chefs who cook in Berlin.');
        expect(body).toContain('[Anna](https://example.com/en/chefs/cook-1): Private chef in Berlin.');
        expect(body).toContain('[Home](https://example.com/en):');
        expect(body).not.toContain('## Occasions');
        expect(body).not.toContain('## Articles');
        expect(body).not.toContain('Public page at');
    });
});
