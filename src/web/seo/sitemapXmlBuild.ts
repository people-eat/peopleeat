import { DEFAULT_LOCALE, LOCALES } from '../utils/locale';
import type { Locale } from '../utils/locale';
import type { SitemapPath } from './sitemapRoutes';

export interface SitemapUrlEntry extends SitemapPath {
    lastmod?: string;
}

export interface SitemapIndexChild {
    /** Absolute path of the child sitemap, e.g. `/sitemap-pages.xml`. */
    path: string;
    lastmod: string;
}

export function toIsoDate(value: Date | string): string {
    return new Date(value).toISOString();
}

export function maxLastModified(items: ReadonlyArray<{ lastModifiedAt: Date | string }>, fallback: Date | string): string {
    if (items.length === 0) return toIsoDate(fallback);
    const latest = items.reduce<Date>((acc, item) => {
        const itemDate = new Date(item.lastModifiedAt);
        return itemDate > acc ? itemDate : acc;
    }, new Date(0));
    return toIsoDate(latest);
}

function sitemapUrl(webPageUrl: string, locale: Locale, path: string): string {
    const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
    const suffix = path === '/' ? '' : path;
    return `${webPageUrl}${prefix}${suffix}` || webPageUrl;
}

export function sitemapUrlsetBuild(webPageUrl: string, entries: ReadonlyArray<SitemapUrlEntry>): string {
    const urls = entries.flatMap((entry) => LOCALES.map((locale) => sitemapUrlEntry(webPageUrl, entry, locale))).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
}

export function sitemapIndexBuild(webPageUrl: string, children: ReadonlyArray<SitemapIndexChild>): string {
    const entries = children
        .map(
            ({ path, lastmod }) =>
                `  <sitemap>
    <loc>${webPageUrl}${path}</loc>
    <lastmod>${toIsoDate(lastmod)}</lastmod>
  </sitemap>`,
        )
        .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>
`;
}

function sitemapUrlEntry(webPageUrl: string, entry: SitemapUrlEntry, locale: Locale): string {
    const loc = sitemapUrl(webPageUrl, locale, entry.path);
    const alternates = LOCALES.map(
        (otherLocale) =>
            `    <xhtml:link rel="alternate" hreflang="${otherLocale}" href="${sitemapUrl(webPageUrl, otherLocale, entry.path)}" />`,
    ).join('\n');
    const xDefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${sitemapUrl(webPageUrl, DEFAULT_LOCALE, entry.path)}" />`;
    const lastmodTag = entry.lastmod ? `\n    <lastmod>${toIsoDate(entry.lastmod)}</lastmod>` : '';
    const changefreq = entry.changefreq ? `\n    <changefreq>${entry.changefreq}</changefreq>` : '';
    const priority = entry.priority !== undefined ? `\n    <priority>${entry.priority.toFixed(1)}</priority>` : '';
    return `  <url>
    <loc>${loc}</loc>
${alternates}
${xDefault}${lastmodTag}${changefreq}${priority}
  </url>`;
}
