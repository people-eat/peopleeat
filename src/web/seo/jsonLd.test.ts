import { describe, expect, it } from 'vitest';

import { jsonLdBlogPosting, jsonLdBreadcrumbList, jsonLdCityService, jsonLdFaqPage, jsonLdPerson, jsonLdScripts } from './jsonLd';

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

describe('jsonLdPerson', () => {
    it('includes a rating only when reviews exist', () => {
        // Arrange — nothing
        // Act
        const withRating = JSON.parse(
            jsonLdPerson({
                webPageUrl: 'https://example.com',
                locale: 'de',
                path: '/chefs/cook-1',
                name: 'Anna',
                description: 'Anna kocht in Berlin.',
                image: '/api/file-uploads/pic',
                cityName: 'Berlin',
                rating: { averageRating: 4.5, reviewCount: 2 },
            }).children,
        ) as { image: string; aggregateRating: { reviewCount: number }; jobTitle: string };
        const withoutRating = JSON.parse(
            jsonLdPerson({
                webPageUrl: 'https://example.com',
                locale: 'en',
                path: '/chefs/cook-1',
                name: 'Anna',
                description: 'Anna cooks in Berlin.',
                rating: null,
            }).children,
        ) as { aggregateRating?: unknown; jobTitle: string };

        // Assert
        expect(withRating.jobTitle).toBe('Privatkoch');
        expect(withRating.image).toBe('https://example.com/api/file-uploads/pic');
        expect(withRating.aggregateRating.reviewCount).toBe(2);
        expect(withoutRating.jobTitle).toBe('Private chef');
        expect(withoutRating.aggregateRating).toBeUndefined();
    });
});

describe('jsonLdBreadcrumbList', () => {
    it('builds absolute locale URLs', () => {
        // Arrange — nothing
        // Act
        const list = JSON.parse(
            jsonLdBreadcrumbList('https://example.com', 'en', [
                { name: 'peopleeat', path: '/' },
                { name: 'All chefs', path: '/chefs' },
            ]).children,
        ) as { itemListElement: Array<{ position: number; item: string }> };

        // Assert
        expect(list.itemListElement[0]?.item).toBe('https://example.com/en');
        expect(list.itemListElement[1]?.position).toBe(2);
        expect(list.itemListElement[1]?.item).toBe('https://example.com/en/chefs');
    });
});

describe('jsonLdCityService', () => {
    it('places the city coordinates on the served area', () => {
        // Arrange — nothing
        // Act
        const service = JSON.parse(
            jsonLdCityService({
                webPageUrl: 'https://example.com',
                locale: 'de',
                path: '/cities/berlin',
                name: 'Privatkoch in Berlin',
                description: 'Köche für Berlin.',
                cityName: 'Berlin',
                latitude: 52.52,
                longitude: 13.405,
            }).children,
        ) as { areaServed: { geo: { latitude: number } } };

        // Assert
        expect(service.areaServed.geo.latitude).toBe(52.52);
    });
});

describe('jsonLdBlogPosting', () => {
    it('emits publish and update dates', () => {
        // Arrange — nothing
        // Act
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

        // Assert
        expect(posting.headline).toBe('Hello');
        expect(posting.datePublished).toBe('2024-01-02T00:00:00.000Z');
        expect(posting.inLanguage).toBe('en-US');
    });
});
