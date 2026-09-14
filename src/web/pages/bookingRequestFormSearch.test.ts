import { describe, expect, it } from 'vitest';

import {
    bookingRequestFormExactAddressFromSearch,
    bookingRequestFormSearchEqual,
    bookingRequestFormSearchFromValues,
    bookingRequestFormValuesFromSearch,
    parseBookingRequestFormSearch,
} from './bookingRequestFormSearch';

describe('parseBookingRequestFormSearch', () => {
    it('parses scalars, preferences pipe list, and price class', () => {
        const search = parseBookingRequestFormSearch({
            occasion: ' Birthday ',
            dateTime: '2030-06-15T18:00:00.000Z',
            adults: '3',
            children: '1',
            message: 'Hello cooks',
            preferences: 'Italian|Vegan',
            priceClass: 'HIGH',
            redeemCode: 'SAVE-50',
            step: 'message',
        });

        expect(search).toEqual({
            occasion: 'Birthday',
            dateTime: '2030-06-15T18:00:00.000Z',
            adults: 3,
            children: 1,
            message: 'Hello cooks',
            preferences: ['Italian', 'Vegan'],
            priceClass: 'HIGH',
            redeemCode: 'SAVE-50',
            location: undefined,
            lat: undefined,
            lng: undefined,
            addressLine1: undefined,
            addressLine2: undefined,
            city: undefined,
            postCode: undefined,
            state: undefined,
            country: undefined,
            step: 'message',
        });
    });

    it('restores a complete venue from flat address params', () => {
        const search = parseBookingRequestFormSearch({
            location: 'Musterstraße 1, München',
            lat: '48.137',
            lng: '11.575',
            addressLine1: 'Musterstraße 1',
            city: 'München',
            postCode: '80331',
            country: 'DE',
        });
        const address = bookingRequestFormExactAddressFromSearch(search);
        expect(address).toEqual({
            displayText: 'Musterstraße 1, München',
            latitude: 48.137,
            longitude: 11.575,
            addressLine1: 'Musterstraße 1',
            addressLine2: '',
            city: 'München',
            postCode: '80331',
            state: '',
            country: 'DE',
        });
    });

    it('round-trips draft values through search', () => {
        const values = bookingRequestFormValuesFromSearch(
            parseBookingRequestFormSearch({
                occasion: 'Wedding',
                adults: 4,
                priceClass: 'MEDIUM',
                message: 'Please cook',
                redeemCode: 'ABC',
                location: 'Berlin',
                lat: 52.52,
                lng: 13.4,
                addressLine1: 'Street 1',
                city: 'Berlin',
                country: 'DE',
            }),
        );
        const next = bookingRequestFormSearchFromValues({ values, step: 'auth' });
        expect(next.occasion).toBe('Wedding');
        expect(next.priceClass).toBe('MEDIUM');
        expect(next.redeemCode).toBe('ABC');
        expect(next.step).toBe('auth');
        expect(next.city).toBe('Berlin');
        expect(next.lat).toBe(52.52);
    });

    it('treats equal search snapshots as equal', () => {
        const a = bookingRequestFormSearchFromValues({
            values: bookingRequestFormValuesFromSearch({
                occasion: 'Birthday',
                adults: 4,
                dateTime: '2030-06-15T18:00:00.000Z',
            }),
            step: 'occasion',
        });
        const b = parseBookingRequestFormSearch({
            occasion: 'Birthday',
            adults: 4,
            dateTime: '2030-06-15T18:00:00.000Z',
        });
        expect(bookingRequestFormSearchEqual(a, b)).toBe(true);
    });
});
