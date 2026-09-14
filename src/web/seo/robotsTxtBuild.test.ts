import { describe, expect, it } from 'vitest';

import { robotsTxtBuild } from './robotsTxtBuild';

describe('robotsTxtBuild', () => {
    it('allows all, disallows API/server and legacy booking query params, and lists a single sitemap index', () => {
        const body = robotsTxtBuild('https://example.com');

        expect(body).toContain('User-agent: *\nAllow: /');
        expect(body).toContain('Disallow: /api/');
        expect(body).toContain('Disallow: /server/');
        expect(body).toContain('Disallow: /*?locationLatitude');
        expect(body).toContain('Disallow: /*?locationLongitude');
        expect(body).toContain('Disallow: /*?locationText');
        expect(body).toContain('Disallow: /*?dateString');
        expect(body).toContain('Disallow: /*?address');
        expect(body).toContain('Disallow: /*?adults=');
        expect(body).toContain('Disallow: /*?children=');
        expect(body).toContain('User-agent: GPTBot\nAllow: /');
        expect(body).toContain('Sitemap: https://example.com/sitemap.xml\n');
        expect(body).not.toContain('Sitemap: https://example.com/sitemap-cities.xml');
        expect(body).not.toContain('Sitemap: https://example.com/sitemap-pages.xml');
    });
});
