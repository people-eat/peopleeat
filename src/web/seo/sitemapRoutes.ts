// Indexable paths for the dynamic `/sitemap-pages.xml` child (referenced from
// the `/sitemap.xml` index). Each entry is the canonical path WITHOUT a locale
// prefix and starting with `/`. The pages sitemap emits one URL per locale per
// entry, with `xhtml:link rel="alternate" hreflang="…"` cross-links.
//
// **Add a new entry whenever you add a public, indexable page.** Skip:
//
//   - `/api/*`, `/server/*` and any other handler-only route
//   - parameterized paths whose values aren't enumerable here (e.g.
//     `/chat/$chatId`) — generate a per-row sitemap from the DB instead
//   - logged-in / transactional / noindex pages (see `seoMeta`'s
//     `noindex: true` option) — these stay out of both the sitemap and
//     search engines
//
// Optional `changefreq` and `priority` follow the sitemaps.org spec; both
// are advisory and most engines now ignore them, so keep them simple.

export interface SitemapPath {
    path: string;
    changefreq?: 'daily' | 'weekly' | 'monthly' | 'yearly';
    priority?: number;
}

export const SITEMAP_PATHS: ReadonlyArray<SitemapPath> = [
    { path: '/', changefreq: 'weekly', priority: 1.0 },
    { path: '/cities', changefreq: 'weekly', priority: 0.8 },
    { path: '/partners', changefreq: 'weekly', priority: 0.7 },
    { path: '/occasions', changefreq: 'weekly', priority: 0.7 },
    { path: '/chefs', changefreq: 'weekly', priority: 0.8 },
    { path: '/blog-posts', changefreq: 'weekly', priority: 0.6 },
    { path: '/about-us', changefreq: 'monthly', priority: 0.3 },
    { path: '/gift-card', changefreq: 'monthly', priority: 1.0 },
    { path: '/how-to-become-a-chef', changefreq: 'monthly', priority: 0.7 },
    { path: '/booking-request', changefreq: 'monthly', priority: 0.7 },
    { path: '/chef-sign-up', changefreq: 'monthly', priority: 0.6 },
    { path: '/imprint', changefreq: 'yearly', priority: 0.3 },
    { path: '/terms-and-conditions', changefreq: 'yearly', priority: 0.3 },
    { path: '/privacy-policy', changefreq: 'yearly', priority: 0.3 },
];
