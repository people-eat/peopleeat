import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import type { CityCreate } from '../db/schema';
import { cities } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { publicCityFindMany } from './publicCityFindMany';
import { publicCityFindOneByPathName } from './publicCityFindOneByPathName';

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

describe('publicCityFindMany', () => {
    it('includes published cities and excludes unpublished ones', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const published = await insertCity({ nameDe: 'published-city', publishedAt: new Date('2024-01-01T00:00:00.000Z') });
        const unpublished = await insertCity({ nameDe: 'draft-city', publishedAt: null });

        // Act
        const rows = await publicCityFindMany(serverRuntime);

        // Assert
        expect(rows.some((row) => row.cityId === published.cityId)).toBe(true);
        expect(rows.some((row) => row.cityId === unpublished.cityId)).toBe(false);
    });
});

describe('publicCityFindOneByPathName', () => {
    it('returns the published city by its current path name', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const pathName = `published-city-${idCreate()}`;
        const city = await insertCity({ pathName, nameDe: 'published-city', publishedAt: new Date('2024-01-01T00:00:00.000Z') });

        // Act
        const row = await publicCityFindOneByPathName({ pathName }, serverRuntime);

        // Assert
        expect(row).toMatchObject({ cityId: city.cityId, pathName });
    });

    it('returns null for an unpublished city path name', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const pathName = `draft-city-${idCreate()}`;
        await insertCity({ pathName, nameDe: 'draft-city', publishedAt: null });

        // Act / Assert
        await expect(publicCityFindOneByPathName({ pathName }, serverRuntime)).resolves.toBeNull();
    });

    it('returns null when the path name does not match any city', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();

        // Act / Assert
        await expect(publicCityFindOneByPathName({ pathName: `no-such-path-${idCreate()}` }, serverRuntime)).resolves.toBeNull();
    });
});
