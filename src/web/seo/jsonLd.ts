// JSON-LD (schema.org) builders. Search engines and AI-search engines use
// these blocks to render rich snippets and to attribute entities (WebSite,
// Organization, etc.) without inferring them from HTML. Output shape matches
// TanStack Router `head().scripts`: each entry renders as a
// `<script type="application/ld+json">…</script>` in the document head.
//
// Builders:
//   - `jsonLdScripts(webPageUrl)` — `WebSite` + `Organization` for the
//     homepage (or any page that should ground site identity).
//   - `jsonLdFaqPage(qa)` — optional `FAQPage` for a visible Q&A block.
//     Pass the same entries the DOM renders so schema and content cannot drift.
//
// `dateModified` is the last-commit ISO timestamp injected by Vite
// (`__SITE_LAST_MODIFIED__`) — without it AI engines have no freshness
// signal and may deprioritise stale-looking content.
// See docs/architecture/discovery-geo.md.

import { languageTagFromLocale, LOCALES } from '../../shared';
import { SITE_LOGO, SITE_NAME } from './seoConstants';

interface JsonLdScript {
    type: 'application/ld+json';
    children: string;
}

export interface FaqEntry {
    question: string;
    answer: string;
}

export function jsonLdScripts(webPageUrl: string): ReadonlyArray<JsonLdScript> {
    const organization = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${webPageUrl}/#organization`,
        name: SITE_NAME,
        url: webPageUrl,
        logo: `${webPageUrl}${SITE_LOGO}`,
    };

    const webSite = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${webPageUrl}/#website`,
        url: webPageUrl,
        name: SITE_NAME,
        inLanguage: LOCALES.map(languageTagFromLocale),
        dateModified: __SITE_LAST_MODIFIED__,
        publisher: { '@id': `${webPageUrl}/#organization` },
    };

    return [
        { type: 'application/ld+json', children: JSON.stringify(webSite) },
        { type: 'application/ld+json', children: JSON.stringify(organization) },
    ];
}

export function jsonLdFaqPage(entries: ReadonlyArray<FaqEntry>): JsonLdScript {
    const faqPage = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        dateModified: __SITE_LAST_MODIFIED__,
        mainEntity: entries.map((entry) => ({
            '@type': 'Question',
            name: entry.question,
            acceptedAnswer: { '@type': 'Answer', text: entry.answer },
        })),
    };
    return { type: 'application/ld+json', children: JSON.stringify(faqPage) };
}
