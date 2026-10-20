import { tool } from 'ai';
import { z } from 'zod';
import { PRODUCT_DOCS_READ_MAX_SLUGS, productDocsReadPages } from './productDocsWiki';

/**
 * Read-only wiki page fetch for the admin assistant. Catalog slugs live in the
 * system prompt (`productDocsCatalogFormat`); this tool returns product bodies
 * (above `## Implementation` only).
 */
export function toolProductDocsRead() {
    return tool({
        description: [
            'Read product documentation pages from the feature-docs wiki.',
            'Use when the operator asks how a product or admin surface works, policies, journeys, or decisions — not for live row data.',
            'Pass slug(s) from the Product docs wiki index in the system prompt (e.g. admin-booking-requests, booking-offers).',
            `At most ${PRODUCT_DOCS_READ_MAX_SLUGS} slugs per call; call again for more pages.`,
            'Returned bodies are product-only (no Implementation / schema / file paths). Prefer list tools for live database rows.',
        ].join(' '),
        inputSchema: z.object({
            slugs: z
                .array(z.string().min(1))
                .min(1)
                .describe(`Feature doc slug(s) from the wiki index (filename without .md). Max ${PRODUCT_DOCS_READ_MAX_SLUGS} per call.`),
        }),
        execute({ slugs }) {
            return productDocsReadPages(slugs);
        },
    });
}
