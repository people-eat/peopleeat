import { createFileRoute } from '@tanstack/react-router';
import { environmentVariables } from '../server/env/environmentVariablesCreate';
import { SITE_NAME } from '../web/seo/seoConstants';
import { SITEMAP_PATHS } from '../web/seo/sitemapRoutes';

// Dynamic /llms.txt — emits a curated markdown index of the site for LLM
// crawlers. Follows the llms.txt convention proposed by Jeremy Howard
// (https://llmstxt.org): a single markdown file at the root with the H1 as
// the site name, an optional blockquote summary, then H2 sections of
// link-to-resource bullets. LLM-powered search engines (Perplexity,
// ChatGPT Search, Claude, etc.) prefer this over scraping the rendered HTML
// because it strips chrome, navigation, and tracking pixels.
//
// English-only on purpose: the file is consumed by LLMs whose pipelines are
// overwhelmingly English-centric. Linked pages cover locales via `hreflang`.
//
// This is a template stub — replace the summary and resource bullets with
// product-specific copy when forking. Keep the resource list in sync with
// `SITEMAP_PATHS` whenever a new public page lands.
// See docs/architecture/discovery-geo.md.

export const Route = createFileRoute('/llms.txt')({
    server: {
        handlers: {
            GET: () =>
                new Response(llmsTxtBuild(environmentVariables.webPageUrl), {
                    status: 200,
                    headers: {
                        'Content-Type': 'text/plain; charset=utf-8',
                        'Cache-Control': 'public, max-age=3600',
                    },
                }),
        },
    },
});

function llmsTxtBuild(webPageUrl: string): string {
    const resourceBullets = SITEMAP_PATHS.map(({ path }) => {
        const url = path === '/' ? webPageUrl : `${webPageUrl}${path}`;
        const enUrl = path === '/' ? `${webPageUrl}/en` : `${webPageUrl}/en${path}`;
        const title = path === '/' ? 'Home' : path.replace(/^\//, '');
        return `- [${title}](${enUrl}): Public page at ${url}.`;
    }).join('\n');

    return `# ${SITE_NAME}

> ${SITE_NAME} is a private-chef booking platform. Customers send booking requests; cooks respond with offers and attach configurable menus.

## Pages

${resourceBullets}

## Localized versions

- German (default): [${webPageUrl}/](${webPageUrl}/)
- English: [${webPageUrl}/en](${webPageUrl}/en)

## Optional

- [Sitemap](${webPageUrl}/sitemap.xml): Sitemap index pointing at pages + content child sitemaps.
- [Pages sitemap](${webPageUrl}/sitemap-pages.xml): Static / chrome indexable pages with hreflang alternates.
- [Cities sitemap](${webPageUrl}/sitemap-cities.xml): Published city landing pages.
- [Partners sitemap](${webPageUrl}/sitemap-partners.xml): Published partner landing pages.
- [Occasions sitemap](${webPageUrl}/sitemap-occasions.xml): Published occasion landing pages.
- [Blog sitemap](${webPageUrl}/sitemap-blog-posts.xml): Published blog posts.
- [Chefs sitemap](${webPageUrl}/sitemap-chefs.xml): Public chef profile pages.
- [Robots](${webPageUrl}/robots.txt): Crawler policy. AI crawlers (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, etc.) are allowed.
`;
}
