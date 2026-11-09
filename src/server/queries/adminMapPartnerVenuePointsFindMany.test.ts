import { describe, expect, it } from 'vitest';

import { commandSetup, partnerVenueInsert } from '../test/commandTestUtils';
import { adminMapPartnerVenuePointsFindMany } from './adminMapPartnerVenuePointsFindMany';
import { adminMapPartnerVenuesMissingLocationCount } from './adminMapPartnerVenuesMissingLocationCount';

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

describe('adminMapPartnerVenuePointsFindMany', () => {
    it('returns coordinates for venues that have a location', async () => {
        const { serverRuntime } = await commandSetup();
        const published = await partnerVenueInsert({
            name: 'Published venue',
            partnerName: 'Acme',
            locationAddress: { ...location, latitude: 53.55, longitude: 9.99 },
            publishedAt: new Date('2030-01-01T00:00:00.000Z'),
        });
        const draft = await partnerVenueInsert({
            name: 'Draft venue',
            locationAddress: { ...location, latitude: 48.14, longitude: 11.57 },
        });
        const missing = await partnerVenueInsert({ name: 'No venue' });

        const points = await adminMapPartnerVenuePointsFindMany(serverRuntime);

        expect(points.find((point) => point.partnerVenueId === published.partnerVenueId)).toMatchObject({
            name: 'Published venue',
            partnerName: 'Acme',
            latitude: 53.55,
            longitude: 9.99,
            published: true,
        });
        expect(points.find((point) => point.partnerVenueId === draft.partnerVenueId)).toMatchObject({
            name: 'Draft venue',
            latitude: 48.14,
            longitude: 11.57,
            published: false,
        });
        expect(points.some((point) => point.partnerVenueId === missing.partnerVenueId)).toBe(false);
    });
});

describe('adminMapPartnerVenuesMissingLocationCount', () => {
    it('counts venues that have no location', async () => {
        const { serverRuntime } = await commandSetup();
        await partnerVenueInsert({ name: 'Unlocated venue' });

        const missing = await adminMapPartnerVenuesMissingLocationCount(serverRuntime);

        expect(missing).toBeGreaterThanOrEqual(1);
    });
});
