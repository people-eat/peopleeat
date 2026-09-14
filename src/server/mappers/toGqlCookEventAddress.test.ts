import { describe, expect, it } from 'vitest';

import { toGqlCookEventAddress } from './toGqlCook';

const venue = {
    displayText: 'Street 1, 10115 Berlin, Germany',
    latitude: 52.52,
    longitude: 13.4,
    addressLine1: 'Street 1',
    addressLine2: '',
    city: 'Berlin',
    postCode: '10115',
    state: 'Berlin',
    country: 'DE',
};

describe('toGqlCookEventAddress', () => {
    it('redacts street fields before dual-accept', () => {
        expect(toGqlCookEventAddress(venue, { revealExact: false })).toEqual({
            displayText: '10115 Berlin',
            latitude: 52.52,
            longitude: 13.4,
            addressLine1: '',
            addressLine2: '',
            city: 'Berlin',
            postCode: '10115',
            state: 'Berlin',
            country: 'DE',
        });
    });

    it('returns the full venue after dual-accept', () => {
        expect(toGqlCookEventAddress(venue, { revealExact: true })).toEqual(venue);
    });
});
