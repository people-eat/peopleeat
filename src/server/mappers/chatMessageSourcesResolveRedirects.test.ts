import { afterEach, describe, expect, it, vi } from 'vitest';
import { chatMessageSourcesResolveRedirects, isGroundingRedirectUrl } from './chatMessageSourcesResolveRedirects';

describe('isGroundingRedirectUrl', () => {
    it('detects Vertex grounding redirects', () => {
        expect(isGroundingRedirectUrl('https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc')).toBe(true);
        expect(isGroundingRedirectUrl('https://uefa.com/euro')).toBe(false);
        expect(isGroundingRedirectUrl('not-a-url')).toBe(false);
    });
});

describe('chatMessageSourcesResolveRedirects', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('leaves non-redirect URLs unchanged', async () => {
        const sources = [{ title: 'UEFA', url: 'https://uefa.com/euro' }];
        await expect(chatMessageSourcesResolveRedirects(sources)).resolves.toEqual(sources);
    });

    it('replaces Vertex redirects with the final Location when fetch follows', async () => {
        const redirect = 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc';
        const destination = 'https://shop.example.com/product/123';
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => ({
                url: destination,
                body: null,
            })),
        );
        await expect(chatMessageSourcesResolveRedirects([{ title: 'shop.example.com', url: redirect }])).resolves.toEqual([
            { title: 'shop.example.com', url: destination },
        ]);
    });

    it('keeps the redirect URL when resolution fails', async () => {
        const redirect = 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc';
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => {
                throw new Error('network');
            }),
        );
        await expect(chatMessageSourcesResolveRedirects([{ title: 'shop.example.com', url: redirect }])).resolves.toEqual([
            { title: 'shop.example.com', url: redirect },
        ]);
    });
});
