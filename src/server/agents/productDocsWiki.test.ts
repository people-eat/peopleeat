import { describe, expect, it } from 'vitest';
import type { ProductDocsPage } from './productDocsWiki';
import {
    PRODUCT_DOCS_READ_MAX_SLUGS,
    productDocsCatalog,
    productDocsCatalogFormat,
    productDocsParsePage,
    productDocsReadPages,
    productDocsStripImplementation,
} from './productDocsWiki';

const SAMPLE_WITH_IMPLEMENTATION = `# Sample feature

One-sentence product summary for operators.

## Behavior

Operators do the thing.

## Implementation

- secret path: src/server/commands/example.ts
`;

const SAMPLE_WITHOUT_IMPLEMENTATION = `# Thin index

Points at other docs only.

## Behavior

No engineering section follows.
`;

function pageMap(entries: ProductDocsPage[]): Map<string, ProductDocsPage> {
    return new Map(entries.map((page) => [page.slug, page]));
}

describe('productDocsStripImplementation', () => {
    it('cuts at ## Implementation', () => {
        const stripped = productDocsStripImplementation(SAMPLE_WITH_IMPLEMENTATION);
        expect(stripped).toContain('## Behavior');
        expect(stripped).not.toContain('## Implementation');
        expect(stripped).not.toContain('src/server/commands');
    });

    it('keeps the whole file when Implementation is absent', () => {
        expect(productDocsStripImplementation(SAMPLE_WITHOUT_IMPLEMENTATION)).toBe(SAMPLE_WITHOUT_IMPLEMENTATION.trimEnd());
    });
});

describe('productDocsParsePage', () => {
    it('parses title, blurb, and stripped body', () => {
        const page = productDocsParsePage('sample-feature', SAMPLE_WITH_IMPLEMENTATION);
        expect(page.slug).toBe('sample-feature');
        expect(page.title).toBe('Sample feature');
        expect(page.blurb).toBe('One-sentence product summary for operators.');
        expect(page.body).toContain('## Behavior');
        expect(page.body).not.toContain('## Implementation');
    });

    it('truncates long blurbs', () => {
        const long = `# Long\n\n${'word '.repeat(80)}\n`;
        const page = productDocsParsePage('long', long);
        expect(page.blurb.length).toBeLessThanOrEqual(140);
        expect(page.blurb.endsWith('...')).toBe(true);
    });
});

describe('productDocsCatalog / productDocsReadPages', () => {
    const pages = pageMap([
        productDocsParsePage('alpha', '# Alpha\n\nAlpha blurb.\n\n## Implementation\n\nx\n'),
        productDocsParsePage('beta', '# Beta\n\nBeta blurb.\n'),
    ]);

    it('lists catalog sorted by slug', () => {
        expect(productDocsCatalog(pages).map((p) => p.slug)).toEqual(['alpha', 'beta']);
    });

    it('reads known slugs and reports missing', () => {
        const result = productDocsReadPages(['beta', 'missing', 'alpha'], pages);
        expect(result.missing).toEqual(['missing']);
        expect(result.truncated).toBe(false);
        expect(result.pages.map((p) => p.slug)).toEqual(['beta', 'alpha']);
        expect(result.pages[0]?.body).not.toContain('## Implementation');
    });

    it('caps batch size and sets truncated', () => {
        const slugs = Array.from({ length: PRODUCT_DOCS_READ_MAX_SLUGS + 2 }, (_, i) => `s${i}`);
        const many = pageMap(slugs.map((slug) => productDocsParsePage(slug, `# ${slug}\n\nBlurb.\n`)));
        const result = productDocsReadPages(slugs, many);
        expect(result.pages).toHaveLength(PRODUCT_DOCS_READ_MAX_SLUGS);
        expect(result.truncated).toBe(true);
        expect(result.missing).toEqual([]);
    });

    it('dedupes slugs', () => {
        const result = productDocsReadPages(['alpha', 'alpha', ' beta '], pages);
        expect(result.pages.map((p) => p.slug)).toEqual(['alpha', 'beta']);
    });
});

describe('productDocsCatalogFormat', () => {
    it('includes wiki rules and index lines', () => {
        const pages = pageMap([productDocsParsePage('booking', '# Booking\n\nHosts request chefs.\n')]);
        const formatted = productDocsCatalogFormat(pages);
        expect(formatted).toContain('Product docs wiki');
        expect(formatted).toContain('productDocsRead');
        expect(formatted).toContain('`booking`: Hosts request chefs.');
    });
});

describe('bundled feature docs corpus', () => {
    it('loads real feature docs without Implementation sections in bodies', () => {
        const catalog = productDocsCatalog();
        expect(catalog.length).toBeGreaterThan(10);
        expect(catalog.some((p) => p.slug === 'assistants')).toBe(true);
        expect(catalog.some((p) => p.slug === 'product-overview')).toBe(true);
        for (const page of catalog) {
            expect(page.body).not.toMatch(/^## Implementation\b/m);
        }
    });
});
