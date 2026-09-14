import { createFileRoute } from '@tanstack/react-router';

import { db } from '../server/db';
import { environmentVariables } from '../server/env/environmentVariablesCreate';
import {
    publicPublishedBlogPostsFindMany,
    publicPublishedCitiesFindMany,
    publicPublishedOccasionsFindMany,
    publicPublishedPartnersFindMany,
} from '../server/utils/contentPageFind';
import { publicVisibleCookIdsFindMany } from '../server/utils/publicVisibleCookIdsFindMany';
import { maxLastModified, sitemapIndexBuild } from '../web/seo/sitemapXmlBuild';

// Sitemap index — points crawlers at child urlsets (static pages + DB-backed
// content). Absolute origin comes from WEB_PAGE_URL. See discovery-seo.md.

export const Route = createFileRoute('/sitemap.xml')({
    server: {
        handlers: {
            GET: async () => {
                const webPageUrl = environmentVariables.webPageUrl;
                const siteLastModified = __SITE_LAST_MODIFIED__;
                const [cities, partners, occasions, blogPosts, cooks] = await Promise.all([
                    publicPublishedCitiesFindMany(db),
                    publicPublishedPartnersFindMany(db),
                    publicPublishedOccasionsFindMany(db),
                    publicPublishedBlogPostsFindMany(db),
                    publicVisibleCookIdsFindMany(db),
                ]);
                const body = sitemapIndexBuild(webPageUrl, [
                    { path: '/sitemap-pages.xml', lastmod: siteLastModified },
                    {
                        path: '/sitemap-cities.xml',
                        lastmod: maxLastModified(
                            cities.map((row) => ({ lastModifiedAt: row.updatedAt })),
                            siteLastModified,
                        ),
                    },
                    {
                        path: '/sitemap-partners.xml',
                        lastmod: maxLastModified(
                            partners.map((row) => ({ lastModifiedAt: row.updatedAt })),
                            siteLastModified,
                        ),
                    },
                    {
                        path: '/sitemap-occasions.xml',
                        lastmod: maxLastModified(
                            occasions.map((row) => ({ lastModifiedAt: row.updatedAt })),
                            siteLastModified,
                        ),
                    },
                    {
                        path: '/sitemap-blog-posts.xml',
                        lastmod: maxLastModified(
                            blogPosts.map((row) => ({ lastModifiedAt: row.updatedAt })),
                            siteLastModified,
                        ),
                    },
                    {
                        path: '/sitemap-chefs.xml',
                        lastmod: maxLastModified(
                            cooks.map((row) => ({ lastModifiedAt: row.lastModifiedAt })),
                            siteLastModified,
                        ),
                    },
                ]);
                return new Response(body, {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/xml; charset=utf-8',
                        'Cache-Control': 'public, max-age=3600',
                    },
                });
            },
        },
    },
});
