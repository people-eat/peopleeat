import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { cities, cityCooks, cooks, occasionCooks, occasions, partnerVenueCooks } from '../db/schema';
import { commandSetup, partnerVenueInsert, testDb } from '../test/commandTestUtils';
import { adminCookFeaturedLandingsFindMany } from './adminCookFeaturedLandingsFindMany';

describe('adminCookFeaturedLandingsFindMany', () => {
    it('returns city, partner, and occasion landings that feature the cook', async () => {
        // Arrange
        const { serverRuntime, user } = await commandSetup.withUser({ firstName: 'Featured', lastName: 'Cook' });
        await testDb.insert(cooks).values({ cookId: user.userId });
        const cityId = idCreate();
        const occasionId = idCreate();
        const token = idCreate().slice(0, 8);
        await testDb.insert(cities).values({
            cityId,
            pathName: `city-${token}`,
            nameDe: `Stadt ${token}`,
            latitude: 52.52,
            longitude: 13.405,
            titleDe: `Titel Stadt ${token}`,
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            sections: [],
        });
        const venue = await partnerVenueInsert({
            pathName: `partner-${token}`,
            name: `Partner ${token}`,
            titleDe: `Titel Partner ${token}`,
        });
        await testDb.insert(occasions).values({
            occasionId,
            pathName: `occasion-${token}`,
            name: `Occasion ${token}`,
            titleDe: `Titel Anlass ${token}`,
            descriptionDe: 'Beschreibung',
            headlineDe: 'Headline',
            subHeadlineDe: 'Sub',
            sections: [],
        });
        await testDb.insert(cityCooks).values({ cityId, cookId: user.userId, position: 0 });
        await testDb.insert(partnerVenueCooks).values({ partnerVenueId: venue.partnerVenueId, cookId: user.userId, position: 0 });
        await testDb.insert(occasionCooks).values({ occasionId, cookId: user.userId, position: 0 });

        // Act
        const rows = await adminCookFeaturedLandingsFindMany(user.userId, serverRuntime);

        // Assert
        expect(rows).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ kind: 'CITY', id: cityId, pathName: `city-${token}` }),
                expect.objectContaining({ kind: 'PARTNER_VENUE', id: venue.partnerVenueId, pathName: `partner-${token}` }),
                expect.objectContaining({ kind: 'OCCASION', id: occasionId, pathName: `occasion-${token}` }),
            ]),
        );
        expect(rows).toHaveLength(3);
    });
});
