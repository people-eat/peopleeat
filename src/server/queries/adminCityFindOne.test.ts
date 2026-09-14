import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { cities } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminCityFindOne } from './adminCityFindOne';

describe('adminCityFindOne', () => {
    it('returns the mapped city row', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const cityId = idCreate();
        await testDb.insert(cities).values({
            cityId,
            pathName: `city-${cityId}`,
            nameDe: 'detail-city',
            latitude: 52.52,
            longitude: 13.405,
            titleDe: 'Titel',
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            sections: [],
        });

        // Act
        const row = await adminCityFindOne({ cityId }, serverRuntime);

        // Assert
        expect(row).toMatchObject({
            cityId,
            nameDe: 'detail-city',
        });
    });

    it('returns null when the city id is unknown', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();

        // Act / Assert
        await expect(adminCityFindOne({ cityId: idCreate() }, serverRuntime)).resolves.toBeNull();
    });
});
