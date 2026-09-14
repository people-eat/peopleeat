import { createFileRoute } from '@tanstack/react-router';

import { environmentVariables } from '../server/env/environmentVariablesCreate';
import { SITEMAP_PATHS } from '../web/seo/sitemapRoutes';
import { sitemapUrlsetBuild } from '../web/seo/sitemapXmlBuild';

// Static / chrome pages urlset — entries from `SITEMAP_PATHS`. Referenced by
// the `/sitemap.xml` index. Adding an indexable page is a one-line edit in
// sitemapRoutes.ts.

export const Route = createFileRoute('/sitemap-pages.xml')({
    server: {
        handlers: {
            GET: () => {
                const lastmod = __SITE_LAST_MODIFIED__;
                const body = sitemapUrlsetBuild(
                    environmentVariables.webPageUrl,
                    SITEMAP_PATHS.map((entry) => ({ ...entry, lastmod })),
                );
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
