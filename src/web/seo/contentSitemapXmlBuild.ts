import { sitemapUrlsetBuild } from './sitemapXmlBuild';

/** Urlset for DB-backed content pages (cities, partners, blog posts, chefs). */
export function contentSitemapXmlBuild(webPageUrl: string, entries: ReadonlyArray<{ path: string; lastmod?: string }>): string {
    return sitemapUrlsetBuild(
        webPageUrl,
        entries.map((entry) => ({
            path: entry.path,
            lastmod: entry.lastmod,
            changefreq: 'weekly',
            priority: 0.7,
        })),
    );
}
