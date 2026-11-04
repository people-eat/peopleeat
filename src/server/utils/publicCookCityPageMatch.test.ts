import { describe, expect, it } from 'vitest';

import { publicCookCityPageMatch } from './publicCookCityPageMatch';
import type { PublicCookCityPageCandidate } from './publicCookCityPageMatch';

const berlin: PublicCookCityPageCandidate = { pathName: 'berlin', nameDe: 'Berlin', nameEn: 'Berlin' };
const munich: PublicCookCityPageCandidate = { pathName: 'muenchen', nameDe: 'München', nameEn: 'Munich' };

describe('publicCookCityPageMatch', () => {
    it('matches a diacritic-insensitive German name', () => {
        // Arrange — nothing
        // Act
        const match = publicCookCityPageMatch('Muenchen', [berlin, munich]);

        // Assert
        expect(match?.pathName).toBe('muenchen');
    });

    it('matches the English name and the path', () => {
        // Arrange — nothing
        // Act
        const byEnglish = publicCookCityPageMatch('Munich', [berlin, munich]);
        const byPath = publicCookCityPageMatch('berlin', [berlin, munich]);

        // Assert
        expect(byEnglish?.pathName).toBe('muenchen');
        expect(byPath?.pathName).toBe('berlin');
    });

    it('returns null when the city is blank, unknown, or ambiguous', () => {
        // Arrange
        const secondBerlin: PublicCookCityPageCandidate = { pathName: 'berlin-mitte', nameDe: 'Berlin', nameEn: '' };

        // Act
        const blank = publicCookCityPageMatch('   ', [berlin]);
        const unknown = publicCookCityPageMatch('Frankfurt', [berlin, munich]);
        const ambiguous = publicCookCityPageMatch('Berlin', [berlin, secondBerlin]);

        // Assert
        expect(blank).toBeNull();
        expect(unknown).toBeNull();
        expect(ambiguous).toBeNull();
    });

    it('does not prefix-match a longer city name', () => {
        // Arrange
        const frankfurt: PublicCookCityPageCandidate = {
            pathName: 'frankfurt-am-main',
            nameDe: 'Frankfurt am Main',
            nameEn: 'Frankfurt am Main',
        };

        // Act
        const match = publicCookCityPageMatch('Frankfurt am Main', [frankfurt]);
        const short = publicCookCityPageMatch('Frankfurt', [frankfurt]);

        // Assert
        expect(match?.pathName).toBe('frankfurt-am-main');
        expect(short).toBeNull();
    });
});
