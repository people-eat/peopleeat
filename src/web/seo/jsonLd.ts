// JSON-LD (schema.org) builders. Search engines and AI-search engines use
// these blocks to render rich snippets and to attribute entities (WebSite,
// Organization, LocalBusiness, Product, Service, BlogPosting) without inferring
// them from HTML. Output shape matches TanStack Router `head().scripts`: each
// entry renders as a `<script type="application/ld+json">…</script>` in the
// document head.
//
// Builders:
//   - `jsonLdScripts(webPageUrl)` — `WebSite` + `Organization` for the homepage.
//   - `jsonLdFaqPage(qa)` — `FAQPage` for a visible Q&A block. Pass the same
//     entries the DOM renders so schema and content cannot drift.
//   - `jsonLdBreadcrumbList` — trail matching the header logo and the page's index link.
//   - `jsonLdLocalBusiness` — public chef profile (Google-eligible review parent).
//   - `jsonLdCityProduct` — city landing as a bookable offering with optional ratings.
//   - `jsonLdCountryService` — expansion market as a service with country + city Places.
//   - `jsonLdBlogPosting` — article page.
//
// Review snippets: nest `aggregateRating` only on Google-supported parents
// (`LocalBusiness`, `Product`, …). Do not put ratings on `Person` or `Service`.
// Rating numbers must match visible on-page stars / reviews.
//
// `dateModified` on the site identity blocks is the last-commit ISO timestamp
// injected by Vite (`__SITE_LAST_MODIFIED__`).
// See docs/architecture/discovery-geo.md.

import type { Locale } from '../../shared/locale';
import { CATALOG_LOCALES, languageTagFromLocale } from '../../shared/locale';
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

export interface JsonLdRating {
    averageRating: number;
    reviewCount: number;
}

function script(value: unknown): JsonLdScript {
    return { type: 'application/ld+json', children: JSON.stringify(value) };
}

function organizationId(webPageUrl: string): string {
    return `${webPageUrl}/#organization`;
}

function aggregateRatingBlock(rating: JsonLdRating): Record<string, unknown> {
    return {
        '@type': 'AggregateRating',
        ratingValue: rating.averageRating,
        reviewCount: rating.reviewCount,
        bestRating: 5,
        worstRating: 1,
    };
}

/** Average of integer 1–5 ratings already shown on the page; null when none. */
export function jsonLdRatingFromValues(ratings: ReadonlyArray<number | null | undefined>): JsonLdRating | null {
    const values = ratings.filter((rating): rating is number => typeof rating === 'number' && rating >= 1 && rating <= 5);
    if (values.length === 0) return null;
    const sum = values.reduce((total, rating) => total + rating, 0);
    return {
        averageRating: Math.round((sum / values.length) * 10) / 10,
        reviewCount: values.length,
    };
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
        inLanguage: CATALOG_LOCALES.map(languageTagFromLocale),
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

export function jsonLdLocalBusiness(input: {
    webPageUrl: string;
    locale: Locale;
    path: string;
    name: string;
    description: string;
    image?: string | null;
    cityName?: string | null;
    rating?: JsonLdRating | null;
}): JsonLdScript {
    const url = canonicalUrlBuild(input.webPageUrl, input.locale, input.path);
    const image = input.image?.trim() ? imageUrlAbsolute(input.webPageUrl, input.image) : undefined;
    const cityName = input.cityName?.trim() ?? '';
    const business: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        '@id': `${url}#business`,
        name: input.name,
        description: input.description,
        url,
        parentOrganization: { '@id': organizationId(input.webPageUrl) },
    };
    if (image) business.image = image;
    if (cityName) {
        business.address = {
            '@type': 'PostalAddress',
            addressLocality: cityName,
        };
    }
    if (input.rating && input.rating.reviewCount > 0 && input.rating.averageRating != null) {
        business.aggregateRating = aggregateRatingBlock(input.rating);
    }
    return script(business);
}

export function jsonLdCountryService(input: {
    webPageUrl: string;
    locale: Locale;
    path: string;
    name: string;
    description: string;
    countryName: string;
    cities: ReadonlyArray<{ name: string; latitude: number; longitude: number }>;
}): JsonLdScript {
    return script({
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: input.name,
        description: input.description,
        url: canonicalUrlBuild(input.webPageUrl, input.locale, input.path),
        provider: { '@id': organizationId(input.webPageUrl) },
        areaServed: [
            { '@type': 'Country', name: input.countryName },
            ...input.cities.map((city) => ({
                '@type': 'Place',
                name: city.name,
                geo: {
                    '@type': 'GeoCoordinates',
                    latitude: city.latitude,
                    longitude: city.longitude,
                },
            })),
        ],
    });
}

export function jsonLdCityProduct(input: {
    webPageUrl: string;
    locale: Locale;
    path: string;
    name: string;
    description: string;
    cityName: string;
    countryCode: string;
    latitude: number;
    longitude: number;
    image?: string | null;
    rating?: JsonLdRating | null;
}): JsonLdScript {
    const image = input.image?.trim() ? imageUrlAbsolute(input.webPageUrl, input.image) : undefined;
    const product: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: input.name,
        description: input.description,
        url: canonicalUrlBuild(input.webPageUrl, input.locale, input.path),
        brand: { '@id': organizationId(input.webPageUrl) },
        areaServed: {
            '@type': 'Place',
            name: input.cityName,
            address: {
                '@type': 'PostalAddress',
                addressCountry: input.countryCode,
            },
            geo: {
                '@type': 'GeoCoordinates',
                latitude: input.latitude,
                longitude: input.longitude,
            },
        },
    };
    if (image) product.image = image;
    if (input.rating && input.rating.reviewCount > 0 && input.rating.averageRating != null) {
        product.aggregateRating = aggregateRatingBlock(input.rating);
    }
    return script(product);
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
