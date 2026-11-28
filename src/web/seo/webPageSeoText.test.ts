import { describe, expect, it } from 'vitest';

import { webPageSeoText } from './webPageSeoText';

const landing = {
    titleDe: 'Privatkoch buchen',
    titleEn: 'Book a private chef',
    titleNl: '',
    descriptionDe: 'Deutsche Beschreibung.',
    descriptionEn: 'English description.',
    descriptionNl: '',
};

describe('webPageSeoText', () => {
    it('reads CMS German and English columns', () => {
        expect(webPageSeoText('de', landing, 'home')).toEqual({
            title: 'Privatkoch buchen',
            description: 'Deutsche Beschreibung.',
        });
        expect(webPageSeoText('en', landing, 'home')).toEqual({
            title: 'Book a private chef',
            description: 'English description.',
        });
    });

    it('uses Dutch CMS when present', () => {
        const withNl = {
            ...landing,
            titleNl: 'Book a private chef NL',
            descriptionNl: 'Dutch description.',
        };
        expect(webPageSeoText('nl', withNl, 'home')).toEqual({
            title: 'Book a private chef NL',
            description: 'Dutch description.',
        });
    });

    it('falls back to English CMS when Dutch is empty and no catalog prefix is given', () => {
        expect(webPageSeoText('nl', landing)).toEqual({
            title: 'Book a private chef',
            description: 'English description.',
        });
    });
});
