import { createFileRoute } from '@tanstack/react-router';

import { db } from '../server/db';
import { environmentVariables } from '../server/env/environmentVariablesCreate';
import { publicCookLlmsEntriesFindMany } from '../server/queries/publicCookLlmsEntriesFindMany';
import {
    publicPublishedBlogPostsFindMany,
    publicPublishedCitiesFindMany,
    publicPublishedOccasionsFindMany,
} from '../server/utils/contentPageFind';
import { contentLocaleText } from '../shared/contentSection';
import { llmsTxtBuild } from '../web/seo/llmsTxtBuild';

// Dynamic /llms.txt — markdown index for LLM crawlers (https://llmstxt.org).
// English URLs; linked pages cover the other locale via hreflang.
// Process-memory cache keeps responses under Lighthouse's hard 2s fetch timeout
// (cold DB regeneration can exceed that). See docs/architecture/discovery-geo.md.

const CACHE_TTL_MS = 60 * 60 * 1000;

let cached: { body: string; expiresAt: number } | null = null;

async function llmsTxtBodyGet(): Promise<string> {
    const now = Date.now();
    if (cached && cached.expiresAt > now) return cached.body;

    const [cities, occasions, posts, chefs] = await Promise.all([
        publicPublishedCitiesFindMany(db),
        publicPublishedOccasionsFindMany(db),
        publicPublishedBlogPostsFindMany(db),
        publicCookLlmsEntriesFindMany(db),
    ]);
    const body = llmsTxtBuild({
        webPageUrl: environmentVariables.webPageUrl,
        cities: cities.map((city) => ({
            path: `/cities/${city.pathName}`,
            title: contentLocaleText(city.nameDe, city.nameEn, 'en'),
            description: contentLocaleText(city.descriptionDe, city.descriptionEn, 'en'),
        })),
        occasions: occasions.map((occasion) => ({
            path: `/occasions/${occasion.pathName}`,
            title: occasion.name,
            description: contentLocaleText(occasion.descriptionDe, occasion.descriptionEn, 'en'),
        })),
        posts: posts.map((post) => ({
            path: `/blog-posts/${post.pathName}`,
            title: contentLocaleText(post.titleDe, post.titleEn, 'en'),
            description: contentLocaleText(post.descriptionDe, post.descriptionEn, 'en'),
        })),
        chefs,
    });
    cached = { body, expiresAt: now + CACHE_TTL_MS };
    return body;
}

export const Route = createFileRoute('/llms.txt')({
    server: {
        handlers: {
            GET: async () => {
                const body = await llmsTxtBodyGet();
                return new Response(body, {
                    status: 200,
                    headers: {
                        'Content-Type': 'text/plain; charset=utf-8',
                        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
                    },
                });
            },
        },
    },
});
