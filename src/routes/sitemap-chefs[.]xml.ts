import { createFileRoute } from '@tanstack/react-router';

import { db } from '../server/db';
import { environmentVariables } from '../server/env/environmentVariablesCreate';
import { publicVisibleCookIdsFindMany } from '../server/utils/publicVisibleCookIdsFindMany';
import { contentSitemapXmlBuild } from '../web/seo/contentSitemapXmlBuild';

export const Route = createFileRoute('/sitemap-chefs.xml')({
    server: {
        handlers: {
            GET: async () => {
                const rows = await publicVisibleCookIdsFindMany(db);
                const body = contentSitemapXmlBuild(
                    environmentVariables.webPageUrl,
                    rows.map((row) => ({
                        path: `/chefs/${row.cookId}`,
                        lastmod: row.lastModifiedAt.toISOString(),
                    })),
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
