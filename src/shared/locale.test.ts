import { describe, expect, it } from 'vitest';

import { CATALOG_LOCALES, isLocale } from './locale';

describe('locale', () => {
    it('treats French, Italian, Russian, and Dutch as public locales', () => {
        expect(CATALOG_LOCALES).toEqual(['de', 'en', 'fr', 'it', 'ru', 'nl']);
        expect(isLocale('fr')).toBe(true);
        expect(isLocale('it')).toBe(true);
        expect(isLocale('ru')).toBe(true);
        expect(isLocale('nl')).toBe(true);
    });
});
