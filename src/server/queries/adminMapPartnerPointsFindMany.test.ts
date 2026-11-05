import { describe, expect, it } from 'vitest';

import { idCreate } from '../../shared/idCreate';
import { partners } from '../db/schema';
import type { PartnerCreate } from '../db/schema';
import { commandSetup, testDb } from '../test/commandTestUtils';
import { adminMapPartnerPointsFindMany } from './adminMapPartnerPointsFindMany';
import { adminMapPartnersMissingLocationCount } from './adminMapPartnersMissingLocationCount';

const location = {
    displayText: 'Hamburg',
    latitude: 53.55,
    longitude: 9.99,
    addressLine1: 'Hafen 1',
    addressLine2: '',
    city: 'Hamburg',
    postCode: '20457',
    state: 'HH',
    country: 'DE',
};

async function insertPartner(overrides: Partial<PartnerCreate> = {}) {
    const partnerId = overrides.partnerId ?? idCreate();
    await testDb.insert(partners).values({
        partnerId,
        pathName: `partner-${partnerId}`,
        name: `Partner ${partnerId}`,
        titleDe: 'Titel',
        descriptionDe: 'Beschreibung',
        headlineDe: 'Headline',
        subHeadlineDe: 'Sub',
        sections: [],
        ...overrides,
    });
    return partnerId;
}

describe('adminMapPartnerPointsFindMany', () => {
    it('returns coordinates for partners that have a location', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        const publishedId = await insertPartner({
            name: 'Published venue',
            locationAddress: { ...location, latitude: 53.55, longitude: 9.99 },
            publishedAt: new Date('2030-01-01T00:00:00.000Z'),
        });
        const draftId = await insertPartner({
            name: 'Draft venue',
            locationAddress: { ...location, latitude: 48.14, longitude: 11.57 },
        });
        const missingId = await insertPartner({ name: 'No venue' });

        // Act
        const points = await adminMapPartnerPointsFindMany(serverRuntime);

        // Assert
        expect(points.find((point) => point.partnerId === publishedId)).toMatchObject({
            name: 'Published venue',
            latitude: 53.55,
            longitude: 9.99,
            published: true,
        });
        expect(points.find((point) => point.partnerId === draftId)).toMatchObject({
            name: 'Draft venue',
            latitude: 48.14,
            longitude: 11.57,
            published: false,
        });
        expect(points.some((point) => point.partnerId === missingId)).toBe(false);
    });
});

describe('adminMapPartnersMissingLocationCount', () => {
    it('counts partners that have no location', async () => {
        // Arrange
        const { serverRuntime } = await commandSetup();
        await insertPartner({ name: 'Unlocated partner' });

        // Act
        const missing = await adminMapPartnersMissingLocationCount(serverRuntime);

        // Assert
        expect(missing).toBeGreaterThanOrEqual(1);
    });
});
