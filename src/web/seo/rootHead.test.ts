import { describe, expect, it, vi } from 'vitest';

import { rootHead } from './rootHead';

vi.mock('./webPageUrlGet', () => ({
    webPageUrlGet: () => 'https://example.com',
}));

function metaContent(head: ReturnType<typeof rootHead>, key: string): string | undefined {
    const tag = head.meta.find((entry) => ('name' in entry && entry.name === key) || ('property' in entry && entry.property === key));
    return tag && 'content' in tag ? tag.content : undefined;
}

describe('rootHead', () => {
    it('emits the German fallback description and an absolute share image', () => {
        // Arrange — webPageUrlGet is mocked
        // Act
        const head = rootHead();

        // Assert
        expect(metaContent(head, 'description')).toBe(
            'peopleeat: Private-Chef buchen. Kunden senden Anfragen, Köche antworten mit Angeboten und Menüs.',
        );
        expect(metaContent(head, 'og:image')).toBe('https://example.com/seo/og-default.webp');
        expect(metaContent(head, 'og:image:width')).toBe('1200');
        expect(metaContent(head, 'og:image:height')).toBe('630');
        expect(metaContent(head, 'viewport')).toContain('maximum-scale=1');
        expect(metaContent(head, 'viewport')).toContain('viewport-fit=cover');
        expect(head.links.some((link) => link.rel === 'preload' && link.as === 'font')).toBe(true);
    });
});
