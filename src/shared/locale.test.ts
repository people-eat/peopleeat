import { describe, expect, it } from 'vitest';

import { CATALOG_LOCALES, inlineCopy, isLocale } from './locale';

describe('locale', () => {
    it('treats french and italian as public locales', () => {
        expect(CATALOG_LOCALES).toEqual(['de', 'en', 'fr', 'it']);
        expect(isLocale('fr')).toBe(true);
        expect(isLocale('it')).toBe(true);
        expect(isLocale('nl')).toBe(false);
    });

    it('falls unmigrated english copy back to german for other catalog locales', () => {
        const copy = { de: 'Speichern', en: 'Save' };
        expect(inlineCopy(copy, 'en')).toBe('Save');
        expect(inlineCopy(copy, 'de')).toBe('Speichern');
        expect(inlineCopy(copy, 'fr')).toBe('Speichern');
        expect(inlineCopy(copy, 'it')).toBe('Speichern');
    });
});
