import { describe, expect, it } from 'vitest';

import { chefPageCityLabel, chefPageDescription, chefPageTitle } from './chefPageSeo';

describe('chefPageCityLabel', () => {
    it('prefers the localized city-page name when a page matches', () => {
        // Arrange
        const cityPage = { nameDe: 'München', nameEn: 'Munich' };

        // Act
        const de = chefPageCityLabel('de', 'Munich', cityPage);
        const en = chefPageCityLabel('en', 'Munich', cityPage);

        // Assert
        expect(de).toBe('München');
        expect(en).toBe('Munich');
    });

    it('falls back to the travel-origin city when no page matches', () => {
        // Arrange — nothing
        // Act
        const label = chefPageCityLabel('de', '  Hamburg ', null);

        // Assert
        expect(label).toBe('Hamburg');
    });

    it('returns null when the cook has no city', () => {
        // Arrange — nothing
        // Act
        const label = chefPageCityLabel('en', '   ', null);

        // Assert
        expect(label).toBeNull();
    });
});

describe('chefPageTitle', () => {
    it('names the role and city in both locales', () => {
        // Arrange — nothing
        // Act
        const de = chefPageTitle('de', 'Anna', 'Berlin');
        const en = chefPageTitle('en', 'Anna', 'Berlin');

        // Assert
        expect(de).toBe('Anna, Privatkoch in Berlin');
        expect(en).toBe('Anna, private chef in Berlin');
        expect(de.length).toBeLessThanOrEqual(60);
        expect(en.length).toBeLessThanOrEqual(60);
    });

    it('drops the city clause when the full title would exceed 60 characters', () => {
        // Arrange
        const name = 'Alexandria Constantine';
        const city = 'Bad Frankenhausen am Kyffhäuser';

        // Act
        const title = chefPageTitle('de', name, city);

        // Assert
        expect(title).toBe('Alexandria Constantine, Privatkoch');
        expect(title.length).toBeLessThanOrEqual(60);
    });

    it('uses the role alone when there is no city', () => {
        // Arrange — nothing
        // Act
        const title = chefPageTitle('en', 'Anna', null);

        // Assert
        expect(title).toBe('Anna, private chef');
    });
});

describe('chefPageDescription', () => {
    it('uses a long biography summary and clips it to 160 characters', () => {
        // Arrange
        const biographySummary = 'A'.repeat(40) + ' ' + 'B'.repeat(200);

        // Act
        const description = chefPageDescription('en', {
            name: 'Anna',
            city: 'Berlin',
            cuisineStyle: 'Italian',
            biographySummary,
        });

        // Assert
        expect(description.length).toBeLessThanOrEqual(160);
        expect(description.startsWith('A'.repeat(40))).toBe(true);
        expect(description).not.toContain('Italian');
    });

    it('composes a factual sentence when the summary is too short', () => {
        // Arrange — nothing
        // Act
        const de = chefPageDescription('de', {
            name: 'Anna',
            city: 'Berlin',
            cuisineStyle: 'Italienisch',
            biographySummary: 'Kurz',
        });
        const en = chefPageDescription('en', {
            name: 'Anna',
            city: null,
            cuisineStyle: null,
            biographySummary: '',
        });

        // Assert
        expect(de).toContain('Anna kocht als Privatkoch in Berlin.');
        expect(de).toContain('Küche: Italienisch.');
        expect(de).toContain('Unverbindliche Anfrage über peopleeat.');
        expect(de.length).toBeGreaterThanOrEqual(50);
        expect(de.length).toBeLessThanOrEqual(160);
        expect(en).toBe('Anna cooks as a private chef. Send a no-obligation request on peopleeat.');
    });
});
