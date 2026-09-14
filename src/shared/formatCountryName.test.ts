import { describe, expect, it } from 'vitest';

import { formatCountryName } from './formatCountryName';

describe('formatCountryName', () => {
    it('resolves ISO codes to localized names', () => {
        expect(formatCountryName('DE', { locale: 'de' })).toBe('Deutschland');
        expect(formatCountryName('DE', { locale: 'en' })).toBe('Germany');
        expect(formatCountryName('at', { locale: 'de' })).toBe('Österreich');
    });

    it('returns long-form names unchanged', () => {
        expect(formatCountryName('Deutschland', { locale: 'en' })).toBe('Deutschland');
    });

    it('returns empty for blank input', () => {
        expect(formatCountryName('   ', { locale: 'de' })).toBe('');
    });
});
