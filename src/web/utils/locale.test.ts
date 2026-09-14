import { describe, expect, it } from 'vitest';

import { buildLocalePath, isWorkspaceNoDocumentScrollPath, localePath, pathWithoutLocale } from './locale';

describe('localePath', () => {
    it('leaves default-locale paths unprefixed', () => {
        expect(localePath('de', '/log-on')).toBe('/log-on');
    });

    it('prefixes non-default locales', () => {
        expect(localePath('en', '/log-on')).toBe('/en/log-on');
        expect(localePath('en', '/')).toBe('/en');
    });

    it('does not double-prefix an already-prefixed path', () => {
        expect(localePath('en', '/en/log-on')).toBe('/en/log-on');
        expect(localePath('en', '/en/en/log-on')).toBe('/en/log-on');
    });
});

describe('pathWithoutLocale', () => {
    it('strips the non-default locale prefix', () => {
        expect(pathWithoutLocale('/en/admin/users', 'en')).toBe('/admin/users');
        expect(pathWithoutLocale('/en', 'en')).toBe('/');
    });

    it('strips from the path even when the claimed locale is default', () => {
        expect(pathWithoutLocale('/en/about', 'de')).toBe('/about');
    });

    it('collapses doubled locale prefixes', () => {
        expect(pathWithoutLocale('/en/en/about')).toBe('/about');
        expect(pathWithoutLocale('/en/en')).toBe('/');
    });

    it('leaves default-locale paths unchanged', () => {
        expect(pathWithoutLocale('/admin/users', 'de')).toBe('/admin/users');
    });
});

describe('buildLocalePath', () => {
    it('rewrites unprefixed paths to the target locale', () => {
        expect(buildLocalePath('/about', 'de', 'en')).toBe('/en/about');
        expect(buildLocalePath('/about', 'en', 'de')).toBe('/about');
        expect(buildLocalePath('/', 'de', 'en')).toBe('/en');
    });

    it('does not double-prefix when the path already has a locale', () => {
        expect(buildLocalePath('/en/about', 'de', 'en')).toBe('/en/about');
        expect(buildLocalePath('/en/en/about', 'de', 'en')).toBe('/en/about');
    });

    it('strips to default locale from a prefixed path', () => {
        expect(buildLocalePath('/en/about', 'en', 'de')).toBe('/about');
    });
});

describe('isWorkspaceNoDocumentScrollPath', () => {
    it('matches admin, profile, and booking-request form workspaces', () => {
        expect(isWorkspaceNoDocumentScrollPath('/admin')).toBe(true);
        expect(isWorkspaceNoDocumentScrollPath('/admin/users')).toBe(true);
        expect(isWorkspaceNoDocumentScrollPath('/profile')).toBe(true);
        expect(isWorkspaceNoDocumentScrollPath('/profile/booking-requests')).toBe(true);
        expect(isWorkspaceNoDocumentScrollPath('/booking-request/form')).toBe(true);
        expect(isWorkspaceNoDocumentScrollPath('/booking-request/abc/submitted')).toBe(true);
    });

    it('leaves public document-scroll routes alone', () => {
        expect(isWorkspaceNoDocumentScrollPath('/')).toBe(false);
        expect(isWorkspaceNoDocumentScrollPath('/how-to-become-a-chef')).toBe(false);
        expect(isWorkspaceNoDocumentScrollPath('/booking-request')).toBe(false);
        expect(isWorkspaceNoDocumentScrollPath('/booking-request/abc')).toBe(false);
    });
});
