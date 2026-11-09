import { createFileRoute } from '@tanstack/react-router';

import { db } from '../server/db';
import { environmentVariables } from '../server/env/environmentVariablesCreate';
import { publicPublishedPartnerVenuesFindMany } from '../server/utils/contentPageFind';
import { contentSitemapXmlBuild } from '../web/seo/contentSitemapXmlBuild';

export const Route = createFileRoute('/sitemap-venues.xml')({
    server: {
        handlers: {
            GET: async () => {
                const rows = await publicPublishedPartnerVenuesFindMany(db);
                const body = contentSitemapXmlBuild(
                    environmentVariables.webPageUrl,
                    rows.map((row) => ({
                        path: `/venues/${row.pathName}`,
                        lastmod: row.updatedAt.toISOString(),
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
