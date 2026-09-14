import { describe, expect, it } from 'vitest';
import { parseSignInSearch, returnToFromLocation, returnToSafe } from './returnTo';

describe('returnToFromLocation', () => {
    it('joins pathname and searchStr', () => {
        expect(returnToFromLocation({ pathname: '/admin/users', searchStr: '?q=a' })).toBe('/admin/users?q=a');
    });

    it('works with an empty searchStr', () => {
        expect(returnToFromLocation({ pathname: '/en/profile', searchStr: '' })).toBe('/en/profile');
    });
});

describe('returnToSafe', () => {
    it('accepts relative paths with optional search', () => {
        expect(returnToSafe('/admin/users')).toBe('/admin/users');
        expect(returnToSafe('/admin/users/list?q=foo')).toBe('/admin/users/list?q=foo');
        expect(returnToSafe('/en/profile/account')).toBe('/en/profile/account');
        expect(returnToSafe('/admin/account')).toBe('/admin/account');
    });

    it('rejects missing and non-string values', () => {
        expect(returnToSafe(undefined)).toBeUndefined();
        expect(returnToSafe(null)).toBeUndefined();
        expect(returnToSafe(1)).toBeUndefined();
    });

    it('rejects open-redirect shapes', () => {
        expect(returnToSafe('https://evil.com')).toBeUndefined();
        expect(returnToSafe('//evil.com')).toBeUndefined();
        expect(returnToSafe('/\\evil.com')).toBeUndefined();
        expect(returnToSafe('javascript:alert(1)')).toBeUndefined();
        expect(returnToSafe('admin')).toBeUndefined();
    });

    it('trims whitespace before validating', () => {
        expect(returnToSafe('  /profile  ')).toBe('/profile');
    });
});

describe('parseSignInSearch', () => {
    it('keeps a safe returnTo', () => {
        expect(parseSignInSearch({ returnTo: '/admin' })).toEqual({ returnTo: '/admin' });
    });

    it('drops an unsafe returnTo', () => {
        expect(parseSignInSearch({ returnTo: 'https://evil.com' })).toEqual({});
    });
});
