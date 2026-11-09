import { createFileRoute } from '@tanstack/react-router';

import { environmentVariables } from '../server/env/environmentVariablesCreate';

/** Legacy sitemap — send crawlers to `/sitemap-venues.xml`. */
export const Route = createFileRoute('/sitemap-partners.xml')({
    server: {
        handlers: {
            GET: async () => {
                return new Response(null, {
                    status: 301,
                    headers: {
                        Location: `${environmentVariables.webPageUrl}/sitemap-venues.xml`,
                    },
                });
            },
        },
    },
});
