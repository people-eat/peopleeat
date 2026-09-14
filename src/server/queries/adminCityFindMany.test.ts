import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import type { CityCreate } from '../db/schema';
import { cities } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminCityFindMany } from './adminCityFindMany';

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

describe('adminCityFindMany', () => {
    it('returns seeded cities ordered by updatedAt descending', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const older = await insertCity({ nameDe: 'older-city', updatedAt: new Date('2024-01-01T00:00:00.000Z') });
        const newer = await insertCity({ nameDe: 'newer-city', updatedAt: new Date('2024-06-01T00:00:00.000Z') });

        // Act
        const rows = await adminCityFindMany(serverRuntime);

        // Assert
        const olderIdx = rows.findIndex((row) => row.cityId === older.cityId);
        const newerIdx = rows.findIndex((row) => row.cityId === newer.cityId);
        expect(olderIdx).toBeGreaterThanOrEqual(0);
        expect(newerIdx).toBeGreaterThanOrEqual(0);
        expect(newerIdx).toBeLessThan(olderIdx);
        expect(rows[newerIdx]).toMatchObject({ cityId: newer.cityId, nameDe: 'newer-city' });
    });
});
