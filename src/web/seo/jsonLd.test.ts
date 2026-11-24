import { describe, expect, it } from 'vitest';

import {
    jsonLdBlogPosting,
    jsonLdBreadcrumbList,
    jsonLdCityProduct,
    jsonLdCityService,
    jsonLdCountryService,
    jsonLdFaqPage,
    jsonLdLocalBusiness,
    jsonLdRatingFromValues,
    jsonLdScripts,
} from './jsonLd';

describe('jsonLdScripts', () => {
    it('emits WebSite and Organization blocks', () => {
        const scripts = jsonLdScripts('https://example.com');
        expect(scripts).toHaveLength(2);
        expect(scripts[0]?.type).toBe('application/ld+json');
        const webSite = JSON.parse(scripts[0]!.children) as { '@type': string; name: string };
        const organization = JSON.parse(scripts[1]!.children) as {
            '@type': string;
            url: string;
            logo: string;
            legalName: string;
            email: string;
            sameAs: string[];
            address: { addressLocality: string; streetAddress: string };
        };
        expect(webSite['@type']).toBe('WebSite');
        expect(organization['@type']).toBe('Organization');
        expect(organization.url).toBe('https://example.com');
        expect(organization.logo).toBe('https://example.com/logo/peopleeat.png');
        expect(organization.legalName).toBe('PeopleEat UG');
        expect(organization.email).toBe('contact@people-eat.com');
        expect(organization.sameAs).toEqual([
            'https://www.instagram.com/peopleeat_official',
            'https://www.facebook.com/peopleeatsharing',
            'https://www.linkedin.com/company/peopleeat',
        ]);
        expect(organization.address.streetAddress).toBe('Montgolfier-Allee 24');
        expect(organization.address.addressLocality).toBe('Frankfurt am Main');
    });
});

describe('jsonLdFaqPage', () => {
    it('emits an FAQPage block from the same Q&A entries the DOM would render', () => {
        const script = jsonLdFaqPage([{ question: 'What is this?', answer: 'A template.' }]);
        const faq = JSON.parse(script.children) as {
            '@type': string;
            mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }>;
        };
        expect(faq['@type']).toBe('FAQPage');
        expect(faq.mainEntity[0]?.name).toBe('What is this?');
        expect(faq.mainEntity[0]?.acceptedAnswer.text).toBe('A template.');
    });
});

describe('jsonLdRatingFromValues', () => {
    it('averages visible 1–5 ratings and ignores nulls', () => {
        expect(jsonLdRatingFromValues([5, null, 4, undefined, 5])).toEqual({
            averageRating: 4.7,
            reviewCount: 3,
        });
        expect(jsonLdRatingFromValues([null, 0, 6])).toBeNull();
        expect(jsonLdRatingFromValues([])).toBeNull();
    });
});

describe('jsonLdLocalBusiness', () => {
    it('emits LocalBusiness with aggregateRating only when reviews exist', () => {
        const withRating = JSON.parse(
            jsonLdLocalBusiness({
                webPageUrl: 'https://example.com',
                locale: 'de',
                path: '/chefs/cook-1',
                name: 'Anna',
                description: 'Anna kocht in Berlin.',
                image: '/api/file-uploads/pic',
                cityName: 'Berlin',
                rating: { averageRating: 4.8, reviewCount: 12 },
            }).children,
        ) as {
            '@type': string;
            image: string;
            address: { addressLocality: string };
            aggregateRating: { ratingValue: number; reviewCount: number; bestRating: number };
        };
        const withoutRating = JSON.parse(
            jsonLdLocalBusiness({
                webPageUrl: 'https://example.com',
                locale: 'en',
                path: '/chefs/cook-1',
                name: 'Anna',
                description: 'Anna cooks in Berlin.',
            }).children,
        ) as { '@type': string; aggregateRating?: unknown };

        expect(withRating['@type']).toBe('LocalBusiness');
        expect(withRating.image).toBe('https://example.com/api/file-uploads/pic');
        expect(withRating.address.addressLocality).toBe('Berlin');
        expect(withRating.aggregateRating).toEqual({
            '@type': 'AggregateRating',
            ratingValue: 4.8,
            reviewCount: 12,
            bestRating: 5,
            worstRating: 1,
        });
        expect(withoutRating['@type']).toBe('LocalBusiness');
        expect(withoutRating.aggregateRating).toBeUndefined();
    });
});

describe('jsonLdBreadcrumbList', () => {
    it('builds absolute locale URLs', () => {
        const list = JSON.parse(
            jsonLdBreadcrumbList('https://example.com', 'en', [
                { name: 'peopleeat', path: '/' },
                { name: 'All chefs', path: '/chefs' },
            ]).children,
        ) as { itemListElement: Array<{ position: number; item: string }> };

        expect(list.itemListElement[0]?.item).toBe('https://example.com/en');
        expect(list.itemListElement[1]?.position).toBe(2);
        expect(list.itemListElement[1]?.item).toBe('https://example.com/en/chefs');
    });
});

describe('jsonLdCityProduct', () => {
    it('always includes aggregateRating on Product', () => {
        const product = JSON.parse(
            jsonLdCityProduct({
                webPageUrl: 'https://example.com',
                locale: 'de',
                path: '/cities/berlin',
                name: 'Privatkoch in Berlin',
                description: 'Köche für Berlin.',
                cityName: 'Berlin',
                countryCode: 'DE',
                latitude: 52.52,
                longitude: 13.405,
                rating: { averageRating: 5, reviewCount: 3 },
            }).children,
        ) as {
            '@type': string;
            areaServed: {
                geo: { latitude: number };
                address: { addressCountry: string };
            };
            aggregateRating: { ratingValue: number; reviewCount: number };
        };

        expect(product['@type']).toBe('Product');
        expect(product.areaServed.geo.latitude).toBe(52.52);
        expect(product.areaServed.address.addressCountry).toBe('DE');
        expect(product.aggregateRating.ratingValue).toBe(5);
        expect(product.aggregateRating.reviewCount).toBe(3);
    });
});

describe('jsonLdCityService', () => {
    it('emits Service without Product rich-result fields when ratings are absent', () => {
        const service = JSON.parse(
            jsonLdCityService({
                webPageUrl: 'https://example.com',
                locale: 'de',
                path: '/cities/ludwigsburg',
                name: 'Privatkoch in Ludwigsburg',
                description: 'Köche für Ludwigsburg.',
                cityName: 'Ludwigsburg',
                countryCode: 'DE',
                latitude: 48.8891,
                longitude: 9.19428,
            }).children,
        ) as { '@type': string; aggregateRating?: unknown; offers?: unknown };

        expect(service['@type']).toBe('Service');
        expect(service.aggregateRating).toBeUndefined();
        expect(service.offers).toBeUndefined();
    });
});

describe('jsonLdCountryService', () => {
    it('lists the country and named cities as areaServed', () => {
        const service = JSON.parse(
            jsonLdCountryService({
                webPageUrl: 'https://example.com',
                locale: 'en',
                path: '/coming-to/netherlands',
                name: 'peopleeat is coming to the Netherlands',
                description: 'Chefs can join now.',
                countryName: 'the Netherlands',
                cities: [{ name: 'Amsterdam', latitude: 52.3676, longitude: 4.9041 }],
            }).children,
        ) as { areaServed: Array<{ '@type': string; name: string }> };

        expect(service.areaServed[0]).toEqual({ '@type': 'Country', name: 'the Netherlands' });
        expect(service.areaServed[1]?.name).toBe('Amsterdam');
    });
});

describe('jsonLdBlogPosting', () => {
    it('emits publish and update dates', () => {
        const posting = JSON.parse(
            jsonLdBlogPosting({
                webPageUrl: 'https://example.com',
                locale: 'en',
                path: '/blog-posts/hello',
                headline: 'Hello',
                description: 'A lead.',
                datePublished: '2024-01-02T00:00:00.000Z',
                dateModified: '2024-03-04T00:00:00.000Z',
            }).children,
        ) as { datePublished: string; inLanguage: string; headline: string };

        expect(posting.headline).toBe('Hello');
        expect(posting.datePublished).toBe('2024-01-02T00:00:00.000Z');
        expect(posting.inLanguage).toBe('en-US');
    });
});
