import { describe, expect, it } from 'vitest';

import { CATALOG_LOCALES, isLocale } from './locale';

describe('locale', () => {
    it('treats french and italian as public locales', () => {
        expect(CATALOG_LOCALES).toEqual(['de', 'en', 'fr', 'it']);
        expect(isLocale('fr')).toBe(true);
        expect(isLocale('it')).toBe(true);
        expect(isLocale('nl')).toBe(false);
    });
});
