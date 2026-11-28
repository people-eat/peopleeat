import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import type { CityCreate } from '../db/schema';
import { cities } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { publicCookCityPageFindOne } from './publicCookCityPageFindOne';

async function insertCity(overrides: Partial<CityCreate> = {}) {
    const cityId = overrides.cityId ?? idCreate();
    const [row] = await testDb
        .insert(cities)
        .values({
            cityId,
            pathName: `city-${cityId}`,
            nameDe: 'Berlin',
            latitude: 52.52,
            longitude: 13.405,
            titleDe: 'Titel',
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            sections: [],
            ...overrides,
        })
        .returning();
    if (!row) throw new Error('insertCity: insert returned no rows');
    return row;
}

describe('publicCookCityPageFindOne', () => {
    it('returns the published city and ignores drafts', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const publishedName = `Stadt${idCreate()}`;
        const draftName = `Entwurf${idCreate()}`;
        const published = await insertCity({
            pathName: `published-${idCreate()}`,
            nameDe: publishedName,
            nameEn: publishedName,
            publishedAt: new Date('2024-01-01T00:00:00.000Z'),
        });
        await insertCity({
            pathName: `draft-${idCreate()}`,
            nameDe: draftName,
            nameEn: draftName,
            publishedAt: null,
        });

        // Act
        const match = await publicCookCityPageFindOne(publishedName, serverRuntime);
        const draft = await publicCookCityPageFindOne(draftName, serverRuntime);

        // Assert
        expect(match).toEqual({ pathName: published.pathName, nameDe: publishedName, nameEn: publishedName, nameNl: '' });
        expect(draft).toBeNull();
    });
});
