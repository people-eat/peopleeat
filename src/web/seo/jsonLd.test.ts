import { describe, expect, it } from 'vitest';
import { jsonLdFaqPage, jsonLdScripts } from './jsonLd';

describe('jsonLdScripts', () => {
    it('emits WebSite and Organization blocks', () => {
        const scripts = jsonLdScripts('https://example.com');
        expect(scripts).toHaveLength(2);
        expect(scripts[0]?.type).toBe('application/ld+json');
        const webSite = JSON.parse(scripts[0]!.children) as { '@type': string; name: string };
        const organization = JSON.parse(scripts[1]!.children) as { '@type': string; url: string; logo: string };
        expect(webSite['@type']).toBe('WebSite');
        expect(organization['@type']).toBe('Organization');
        expect(organization.url).toBe('https://example.com');
        expect(organization.logo).toBe('https://example.com/logo/peopleeat.png');
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
