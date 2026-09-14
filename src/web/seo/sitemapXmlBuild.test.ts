import { describe, expect, it } from 'vitest';

import { maxLastModified, sitemapIndexBuild, sitemapUrlsetBuild, toIsoDate } from './sitemapXmlBuild';

describe('sitemapXmlBuild', () => {
    it('builds a bilingual urlset with hreflang alternates and lastmod', () => {
        const xml = sitemapUrlsetBuild('https://example.com', [
            { path: '/about-us', changefreq: 'monthly', priority: 0.3, lastmod: '2026-05-20T00:00:00.000Z' },
        ]);

        expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">');
        expect(xml).toContain('<loc>https://example.com/about-us</loc>');
        expect(xml).toContain('<loc>https://example.com/en/about-us</loc>');
        expect(xml).toContain('<xhtml:link rel="alternate" hreflang="de" href="https://example.com/about-us" />');
        expect(xml).toContain('<xhtml:link rel="alternate" hreflang="en" href="https://example.com/en/about-us" />');
        expect(xml).toContain('<xhtml:link rel="alternate" hreflang="x-default" href="https://example.com/about-us" />');
        expect(xml).toContain('<lastmod>2026-05-20T00:00:00.000Z</lastmod>');
        expect(xml).toContain('<changefreq>monthly</changefreq>');
        expect(xml).toContain('<priority>0.3</priority>');
    });

    it('collapses the home path to the bare origin', () => {
        const xml = sitemapUrlsetBuild('https://example.com', [{ path: '/', priority: 1.0 }]);

        expect(xml).toContain('<loc>https://example.com</loc>');
        expect(xml).toContain('<loc>https://example.com/en</loc>');
        expect(xml).not.toContain('https://example.com/</loc>');
    });

    it('builds a sitemap index with absolute child locs', () => {
        const xml = sitemapIndexBuild('https://example.com', [
            { path: '/sitemap-pages.xml', lastmod: '2026-05-20T00:00:00.000Z' },
            { path: '/sitemap-cities.xml', lastmod: '2026-06-01T12:00:00.000Z' },
        ]);

        expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
        expect(xml).toContain('<loc>https://example.com/sitemap-pages.xml</loc>');
        expect(xml).toContain('<loc>https://example.com/sitemap-cities.xml</loc>');
        expect(xml).toContain('<lastmod>2026-05-20T00:00:00.000Z</lastmod>');
        expect(xml).toContain('<lastmod>2026-06-01T12:00:00.000Z</lastmod>');
    });

    it('maxLastModified returns the latest item or the fallback', () => {
        expect(maxLastModified([], '2026-01-01T00:00:00.000Z')).toBe('2026-01-01T00:00:00.000Z');
        expect(
            maxLastModified(
                [{ lastModifiedAt: '2026-02-01T00:00:00.000Z' }, { lastModifiedAt: '2026-03-15T00:00:00.000Z' }],
                '2026-01-01T00:00:00.000Z',
            ),
        ).toBe('2026-03-15T00:00:00.000Z');
        expect(toIsoDate(new Date('2026-04-01T00:00:00.000Z'))).toBe('2026-04-01T00:00:00.000Z');
    });
});
