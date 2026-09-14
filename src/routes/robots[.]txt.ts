import { createFileRoute } from '@tanstack/react-router';
import { environmentVariables } from '../server/env/environmentVariablesCreate';
import { robotsTxtBuild } from '../web/seo/robotsTxtBuild';

// Dynamic robots.txt — absolute `Sitemap:` via WEB_PAGE_URL; excludes API /
// server capture surfaces and legacy booking deep-link query params; enumerates
// AI crawlers with the same Disallow block. See discovery-geo.md.

export const Route = createFileRoute('/robots.txt')({
    server: {
        handlers: {
            GET: () =>
                new Response(robotsTxtBuild(environmentVariables.webPageUrl), {
                    status: 200,
                    headers: {
                        'Content-Type': 'text/plain; charset=utf-8',
                        'Cache-Control': 'public, max-age=3600',
                    },
                }),
        },
    },
});
