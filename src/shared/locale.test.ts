import { describe, expect, it } from 'vitest';

import { CATALOG_LOCALES, isLocale, isOnPlatformSiteHost, localeAwareHref, siteRelativeHrefFromUrl } from './locale';

describe('locale', () => {
    it('treats French, Italian, Russian, and Dutch as public locales', () => {
        expect(CATALOG_LOCALES).toEqual(['de', 'en', 'fr', 'it', 'ru', 'nl']);
        expect(isLocale('fr')).toBe(true);
        expect(isLocale('it')).toBe(true);
        expect(isLocale('ru')).toBe(true);
        expect(isLocale('nl')).toBe(true);
    });
});

describe('isOnPlatformSiteHost', () => {
    it('recognizes production people-eat hosts and extras', () => {
        expect(isOnPlatformSiteHost('people-eat.com')).toBe(true);
        expect(isOnPlatformSiteHost('www.people-eat.com')).toBe(true);
        expect(isOnPlatformSiteHost('example.com')).toBe(false);
        expect(isOnPlatformSiteHost('example.com', ['example.com'])).toBe(true);
    });
});

describe('siteRelativeHrefFromUrl', () => {
    it('keeps site-relative paths and strips locale prefixes', () => {
        expect(siteRelativeHrefFromUrl('/booking-request/plan?venueId=abc')).toBe('/booking-request/plan?venueId=abc');
        expect(siteRelativeHrefFromUrl('/en/booking-request/plan#cta')).toBe('/booking-request/plan#cta');
    });

    it('folds absolute on-platform URLs into unprefixed paths', () => {
        expect(siteRelativeHrefFromUrl('https://people-eat.com/booking-request/plan')).toBe('/booking-request/plan');
        expect(siteRelativeHrefFromUrl('https://www.people-eat.com/en/booking-request/plan?x=1')).toBe('/booking-request/plan?x=1');
        expect(siteRelativeHrefFromUrl('https://staging.example/booking-request/plan', { siteHostnames: ['staging.example'] })).toBe(
            '/booking-request/plan',
        );
    });

    it('leaves external absolute URLs as null', () => {
        expect(siteRelativeHrefFromUrl('https://wa.me/message/abc')).toBeNull();
        expect(siteRelativeHrefFromUrl('https://maps.app.goo.gl/abc')).toBeNull();
    });
});

describe('localeAwareHref', () => {
    it('prefixes on-platform hrefs for the viewer locale', () => {
        expect(localeAwareHref('en', '/booking-request/plan')).toBe('/en/booking-request/plan');
        expect(localeAwareHref('de', '/booking-request/plan')).toBe('/booking-request/plan');
        expect(localeAwareHref('fr', 'https://people-eat.com/booking-request/plan?venueId=1')).toBe('/fr/booking-request/plan?venueId=1');
    });

    it('does not rewrite external URLs', () => {
        expect(localeAwareHref('en', 'https://wa.me/message/abc')).toBe('https://wa.me/message/abc');
    });
});
