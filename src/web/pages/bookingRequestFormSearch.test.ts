import { describe, expect, it } from 'vitest';

import {
    bookingRequestFormClampDateTime,
    bookingRequestFormExactAddressFromSearch,
    bookingRequestFormHourOptions,
    bookingRequestFormMinuteOptions,
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
            minDateTime: undefined,
            maxDateTime: undefined,
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

    it('parses optional minDateTime and maxDateTime ISO bounds', () => {
        const search = parseBookingRequestFormSearch({
            minDateTime: '2030-06-01T16:00:00.000Z',
            maxDateTime: '2030-06-30T22:00:00.000Z',
        });
        expect(search.minDateTime).toBe('2030-06-01T16:00:00.000Z');
        expect(search.maxDateTime).toBe('2030-06-30T22:00:00.000Z');
    });

    it('drops inverted or invalid datetime bounds', () => {
        expect(
            parseBookingRequestFormSearch({
                minDateTime: '2030-07-01T00:00:00.000Z',
                maxDateTime: '2030-06-01T00:00:00.000Z',
            }),
        ).toMatchObject({ minDateTime: undefined, maxDateTime: undefined });
        expect(parseBookingRequestFormSearch({ minDateTime: 'not-a-date' }).minDateTime).toBeUndefined();
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

    it('preserves datetime bounds when rebuilding search from values', () => {
        const values = bookingRequestFormValuesFromSearch({
            occasion: 'Birthday',
            adults: 4,
            dateTime: '2030-06-15T18:00:00.000Z',
            minDateTime: '2030-06-01T16:00:00.000Z',
            maxDateTime: '2030-06-30T22:00:00.000Z',
        });
        const next = bookingRequestFormSearchFromValues({
            values,
            step: 'dateTime',
            minDateTime: '2030-06-01T16:00:00.000Z',
            maxDateTime: '2030-06-30T22:00:00.000Z',
        });
        expect(next.minDateTime).toBe('2030-06-01T16:00:00.000Z');
        expect(next.maxDateTime).toBe('2030-06-30T22:00:00.000Z');
    });

    it('clamps seeded dateTime into optional bounds', () => {
        const beforeMin = bookingRequestFormValuesFromSearch({
            dateTime: '2030-05-01T12:00:00.000Z',
            minDateTime: '2030-06-01T16:00:00.000Z',
            maxDateTime: '2030-06-30T22:00:00.000Z',
        });
        expect(beforeMin.dateTime.toISOString()).toBe('2030-06-01T16:00:00.000Z');

        const afterMax = bookingRequestFormValuesFromSearch({
            dateTime: '2030-08-01T12:00:00.000Z',
            minDateTime: '2030-06-01T16:00:00.000Z',
            maxDateTime: '2030-06-30T22:00:00.000Z',
        });
        expect(afterMax.dateTime.toISOString()).toBe('2030-06-30T22:00:00.000Z');
    });

    it('filters hour and minute options by bounds on the boundary day', () => {
        const day = new Date(2030, 5, 15, 12, 0, 0, 0);
        const bounds = {
            minDateTime: new Date(2030, 5, 15, 18, 0, 0, 0),
            maxDateTime: new Date(2030, 5, 15, 20, 30, 0, 0),
        };
        expect(bookingRequestFormHourOptions(day, bounds)).toEqual([18, 19, 20]);
        expect(bookingRequestFormMinuteOptions(day, 18, bounds)).toEqual([0, 15, 30, 45]);
        expect(bookingRequestFormMinuteOptions(day, 20, bounds)).toEqual([0, 15, 30]);
        expect(bookingRequestFormClampDateTime(new Date(2030, 5, 15, 17, 0, 0, 0), bounds).getTime()).toBe(bounds.minDateTime.getTime());
    });
});
