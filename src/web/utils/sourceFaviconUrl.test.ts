import { describe, expect, it } from 'vitest';
import { faviconDomainFromSource, sourceFaviconUrl } from './sourceFaviconUrl';

describe('faviconDomainFromSource', () => {
    it('returns the URL hostname for normal sources', () => {
        expect(faviconDomainFromSource('https://uefa.com/euro')).toBe('uefa.com');
    });

    it('uses a hostname-shaped title for Vertex grounding redirects', () => {
        expect(faviconDomainFromSource('https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc', 'uefa.com')).toBe('uefa.com');
    });

    it('returns null for grounding redirects without a hostname title', () => {
        expect(faviconDomainFromSource('https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc', 'UEFA Euro page')).toBeNull();
    });
});

describe('sourceFaviconUrl', () => {
    it('builds a Google S2 favicon URL', () => {
        expect(sourceFaviconUrl('https://uefa.com/euro', { size: 32 })).toBe('https://www.google.com/s2/favicons?domain=uefa.com&sz=32');
    });
});
