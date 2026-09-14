import { describe, expect, it } from 'vitest';

import { placeToLocationSuggestion } from './placesCreate';

describe('placeToLocationSuggestion', () => {
    it('maps a full street address', () => {
        const suggestion = placeToLocationSuggestion({
            location: { latitude: 50.1, longitude: 8.6 },
            addressComponents: [
                { longText: 'Hauptstraße', shortText: 'Hauptstraße', types: ['route'] },
                { longText: '1', shortText: '1', types: ['street_number'] },
                { longText: '60311', shortText: '60311', types: ['postal_code'] },
                { longText: 'Frankfurt', shortText: 'Frankfurt', types: ['locality'] },
                { longText: 'Hessen', shortText: 'HE', types: ['administrative_area_level_1'] },
                { longText: 'Deutschland', shortText: 'DE', types: ['country'] },
            ],
        });
        expect(suggestion).toEqual({
            displayText: 'Hauptstraße 1, 60311 Frankfurt, Deutschland',
            latitude: 50.1,
            longitude: 8.6,
            structuredAddress: {
                addressLine1: 'Hauptstraße 1',
                addressLine2: '',
                city: 'Frankfurt',
                postCode: '60311',
                state: 'Hessen',
                country: 'DE',
            },
        });
    });

    it('returns city-only without structuredAddress', () => {
        const suggestion = placeToLocationSuggestion({
            location: { latitude: 50.1, longitude: 8.6 },
            addressComponents: [{ longText: 'Frankfurt', shortText: 'Frankfurt', types: ['locality'] }],
        });
        expect(suggestion).toEqual({
            displayText: 'Frankfurt',
            latitude: 50.1,
            longitude: 8.6,
        });
    });

    it('skips address components with missing types', () => {
        const suggestion = placeToLocationSuggestion({
            location: { latitude: 50.1, longitude: 8.6 },
            addressComponents: [
                { longText: 'unknown', shortText: 'unknown' },
                { longText: 'Frankfurt', shortText: 'Frankfurt', types: ['locality'] },
            ],
        });
        expect(suggestion).toEqual({
            displayText: 'Frankfurt',
            latitude: 50.1,
            longitude: 8.6,
        });
    });
});
