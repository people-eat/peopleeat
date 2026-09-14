import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { cities, cityCooks, cooks, fileUploads, meals } from '../db/schema';
import type { CityCreate } from '../db/schema';
import { toGqlPublicCity } from '../mappers/toGqlCity';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { cityFeaturedCooksFindMany } from './cityFeaturedCooksFindMany';

const berlinOrigin = {
    displayText: 'Berlin',
    latitude: 52.52,
    longitude: 13.405,
    addressLine1: '',
    addressLine2: '',
    city: 'Berlin',
    postCode: '',
    state: '',
    country: 'DE',
} as const;

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

async function insertPublishedMealWithImage(cookId: string, title: string, description: string) {
    const imageFileUploadId = idCreate();
    await testDb.insert(fileUploads).values({
        fileUploadId: imageFileUploadId,
        userId: cookId,
        filename: 'meal.jpg',
        mediaType: 'image/jpeg',
        size: 3,
        bytes: Buffer.from([1, 2, 3]),
    });
    await testDb.insert(meals).values({
        mealId: idCreate(),
        cookId,
        title,
        description,
        publishedAt: new Date(),
        imageFileUploadId,
    });
}

describe('cityFeaturedCooksFindMany', () => {
    it('returns curated cooks in assignment order when CityCooks rows exist', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const city = await insertCity();
        const cookA = await commandSetup.withUser({ firstName: 'Alpha', lastName: 'Cook' });
        const cookB = await commandSetup.withUser({ firstName: 'Beta', lastName: 'Cook' });
        await testDb.insert(cooks).values({
            cookId: cookA.user.userId,
            isVisible: true,
            isApprovedByAdmin: true,
            exactTravelOriginAddress: berlinOrigin,
        });
        await testDb.insert(cooks).values({
            cookId: cookB.user.userId,
            isVisible: true,
            isApprovedByAdmin: true,
            exactTravelOriginAddress: berlinOrigin,
        });
        await insertPublishedMealWithImage(cookA.user.userId, 'Meal A', 'A');
        await insertPublishedMealWithImage(cookB.user.userId, 'Meal B', 'B');
        await testDb.insert(cityCooks).values([
            { cityId: city.cityId, cookId: cookB.user.userId, position: 0 },
            { cityId: city.cityId, cookId: cookA.user.userId, position: 1 },
        ]);

        // Act
        const rows = await cityFeaturedCooksFindMany(toGqlPublicCity(city), serverRuntime);

        // Assert
        expect(rows.map((row) => row.cookId)).toEqual([cookB.user.userId, cookA.user.userId]);
    });

    it('falls back to travel-radius discovery when no CityCooks rows exist', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const city = await insertCity({ latitude: 52.52, longitude: 13.405 });
        const near = await commandSetup.withUser({ firstName: 'Near', lastName: 'Cook' });
        await testDb.insert(cooks).values({
            cookId: near.user.userId,
            isVisible: true,
            isApprovedByAdmin: true,
            maximumTravelDistance: 50,
            exactTravelOriginAddress: {
                ...berlinOrigin,
                latitude: 52.53,
                longitude: 13.4,
            },
        });
        await insertPublishedMealWithImage(near.user.userId, 'Meal', 'Desc');

        // Act
        const rows = await cityFeaturedCooksFindMany(toGqlPublicCity(city), serverRuntime);

        // Assert
        expect(rows.some((row) => row.cookId === near.user.userId)).toBe(true);
    });
});
