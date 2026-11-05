import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { cities } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminMapCityPointsFindMany } from './adminMapCityPointsFindMany';

describe('adminMapCityPointsFindMany', () => {
    it('returns published and unpublished city coordinates', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const publishedId = idCreate();
        const draftId = idCreate();
        const token = idCreate().slice(0, 8);
        await testDb.insert(cities).values([
            {
                cityId: publishedId,
                pathName: `city-pub-${token}`,
                nameDe: `Pub ${token}`,
                nameEn: `Pub en ${token}`,
                latitude: 48.13,
                longitude: 11.58,
                titleDe: 'Titel',
                descriptionDe: 'Beschreibung',
                headlineDe: 'Headline',
                subHeadlineDe: 'Sub',
                sections: [],
                publishedAt: new Date('2030-01-01T00:00:00.000Z'),
            },
            {
                cityId: draftId,
                pathName: `city-draft-${token}`,
                nameDe: `Draft ${token}`,
                nameEn: `Draft en ${token}`,
                latitude: 53.55,
                longitude: 9.99,
                titleDe: 'Titel',
                descriptionDe: 'Beschreibung',
                headlineDe: 'Headline',
                subHeadlineDe: 'Sub',
                sections: [],
            },
        ]);

        // Act
        const points = await adminMapCityPointsFindMany(serverRuntime);

        // Assert
        expect(points.find((point) => point.cityId === publishedId)).toMatchObject({
            latitude: 48.13,
            longitude: 11.58,
            nameDe: `Pub ${token}`,
            nameEn: `Pub en ${token}`,
            published: true,
        });
        expect(points.find((point) => point.cityId === draftId)).toMatchObject({
            latitude: 53.55,
            longitude: 9.99,
            nameDe: `Draft ${token}`,
            nameEn: `Draft en ${token}`,
            published: false,
        });
    });
});
