// JSON-LD (schema.org) builders. Search engines and AI-search engines use
// these blocks to render rich snippets and to attribute entities (WebSite,
// Organization, Person, Service, BlogPosting) without inferring them from HTML.
// Output shape matches TanStack Router `head().scripts`: each entry renders as a
// `<script type="application/ld+json">…</script>` in the document head.
//
// Builders:
//   - `jsonLdScripts(webPageUrl)` — `WebSite` + `Organization` for the homepage.
//   - `jsonLdFaqPage(qa)` — `FAQPage` for a visible Q&A block. Pass the same
//     entries the DOM renders so schema and content cannot drift.
//   - `jsonLdBreadcrumbList` — trail matching the header logo and the page's index link.
//   - `jsonLdPerson` — public chef profile (`Person` only; no `aggregateRating`).
//   - `jsonLdCityService` — city landing as a service in that place.
//   - `jsonLdBlogPosting` — article page.
//
// `dateModified` on the site identity blocks is the last-commit ISO timestamp
// injected by Vite (`__SITE_LAST_MODIFIED__`).
// See docs/architecture/discovery-geo.md.

import type { Locale } from '../../shared/locale';
import { languageTagFromLocale, LOCALES } from '../../shared/locale';
import {
    SITE_CONTACT_EMAIL,
    SITE_FACEBOOK_URL,
    SITE_INSTAGRAM_URL,
    SITE_LEGAL_NAME,
    SITE_LINKEDIN_URL,
    SITE_POSTAL_ADDRESS,
} from '../../shared/siteBranding';
import { SITE_LOGO, SITE_NAME } from './seoConstants';
import { canonicalUrlBuild, imageUrlAbsolute } from './seoMeta';

export interface JsonLdScript {
    type: 'application/ld+json';
    children: string;
}

export interface FaqEntry {
    question: string;
    answer: string;
}

export interface JsonLdBreadcrumb {
    name: string;
    path: string;
}

function script(value: unknown): JsonLdScript {
    return { type: 'application/ld+json', children: JSON.stringify(value) };
}

function organizationId(webPageUrl: string): string {
    return `${webPageUrl}/#organization`;
}

export function jsonLdHeadScripts(scripts: ReadonlyArray<JsonLdScript>): JsonLdScript[] {
    return scripts.map((entry) => ({ type: entry.type, children: entry.children }));
}

export function jsonLdScripts(webPageUrl: string): ReadonlyArray<JsonLdScript> {
    const organization = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': organizationId(webPageUrl),
        name: SITE_NAME,
        legalName: SITE_LEGAL_NAME,
        url: webPageUrl,
        logo: `${webPageUrl}${SITE_LOGO}`,
        email: SITE_CONTACT_EMAIL,
        sameAs: [SITE_INSTAGRAM_URL, SITE_FACEBOOK_URL, SITE_LINKEDIN_URL],
        address: {
            '@type': 'PostalAddress',
            streetAddress: SITE_POSTAL_ADDRESS.streetAddress,
            postalCode: SITE_POSTAL_ADDRESS.postalCode,
            addressLocality: SITE_POSTAL_ADDRESS.addressLocality,
            addressCountry: SITE_POSTAL_ADDRESS.addressCountry,
        },
        contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            email: SITE_CONTACT_EMAIL,
            availableLanguage: ['German', 'English'],
        },
    };

    const webSite = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${webPageUrl}/#website`,
        url: webPageUrl,
        name: SITE_NAME,
        inLanguage: LOCALES.map(languageTagFromLocale),
        dateModified: __SITE_LAST_MODIFIED__,
        publisher: { '@id': organizationId(webPageUrl) },
    };

    return [script(webSite), script(organization)];
}

export function jsonLdFaqPage(entries: ReadonlyArray<FaqEntry>): JsonLdScript {
    return script({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        dateModified: __SITE_LAST_MODIFIED__,
        mainEntity: entries.map((entry) => ({
            '@type': 'Question',
            name: entry.question,
            acceptedAnswer: { '@type': 'Answer', text: entry.answer },
        })),
    });
}

export function jsonLdBreadcrumbList(webPageUrl: string, locale: Locale, crumbs: ReadonlyArray<JsonLdBreadcrumb>): JsonLdScript {
    return script({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((crumb, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: crumb.name,
            item: canonicalUrlBuild(webPageUrl, locale, crumb.path),
        })),
    });
}

export function jsonLdPerson(input: {
    webPageUrl: string;
    locale: Locale;
    path: string;
    name: string;
    description: string;
    image?: string | null;
    cityName?: string | null;
}): JsonLdScript {
    const url = canonicalUrlBuild(input.webPageUrl, input.locale, input.path);
    const image = input.image?.trim() ? imageUrlAbsolute(input.webPageUrl, input.image) : undefined;
    const cityName = input.cityName?.trim() ?? '';
    const person: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        '@id': `${url}#person`,
        name: input.name,
        description: input.description,
        url,
        jobTitle: { de: 'Privatkoch', en: 'Private chef' }[input.locale],
        worksFor: { '@id': organizationId(input.webPageUrl) },
    };
    if (image) person.image = image;
    if (cityName) person.homeLocation = { '@type': 'City', name: cityName };
    return script(person);
}

export function jsonLdCityService(input: {
    webPageUrl: string;
    locale: Locale;
    path: string;
    name: string;
    description: string;
    cityName: string;
    latitude: number;
    longitude: number;
    image?: string | null;
}): JsonLdScript {
    const image = input.image?.trim() ? imageUrlAbsolute(input.webPageUrl, input.image) : undefined;
    const service: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: input.name,
        description: input.description,
        url: canonicalUrlBuild(input.webPageUrl, input.locale, input.path),
        provider: { '@id': organizationId(input.webPageUrl) },
        areaServed: {
            '@type': 'Place',
            name: input.cityName,
            geo: {
                '@type': 'GeoCoordinates',
                latitude: input.latitude,
                longitude: input.longitude,
            },
        },
    };
    if (image) service.image = image;
    return script(service);
}

export function jsonLdBlogPosting(input: {
    webPageUrl: string;
    locale: Locale;
    path: string;
    headline: string;
    description: string;
    datePublished?: string | null;
    dateModified?: string | null;
    image?: string | null;
}): JsonLdScript {
    const url = canonicalUrlBuild(input.webPageUrl, input.locale, input.path);
    const image = input.image?.trim() ? imageUrlAbsolute(input.webPageUrl, input.image) : undefined;
    const posting: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: input.headline,
        description: input.description,
        url,
        mainEntityOfPage: url,
        inLanguage: languageTagFromLocale(input.locale),
        author: { '@id': organizationId(input.webPageUrl) },
        publisher: { '@id': organizationId(input.webPageUrl) },
    };
    if (input.datePublished) posting.datePublished = input.datePublished;
    if (input.dateModified) posting.dateModified = input.dateModified;
    if (image) posting.image = image;
    return script(posting);
}
