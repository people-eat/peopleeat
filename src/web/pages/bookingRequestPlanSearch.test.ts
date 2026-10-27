import { describe, expect, it } from 'vitest';

import {
    bookingRequestPlanResolveVenue,
    bookingRequestPlanSearchEqual,
    bookingRequestPlanSearchFromValues,
    bookingRequestPlanSelectableDays,
    bookingRequestPlanUsesDateChips,
    bookingRequestPlanValuesFromSearch,
    parseBookingRequestPlanSearch,
} from './bookingRequestPlanSearch';

describe('parseBookingRequestPlanSearch', () => {
    it('parses partnerId, firstName, cuisine, and guest aliases', () => {
        const parsed = parseBookingRequestPlanSearch({
            partnerId: 'partner_abc1234567890',
            firstName: ' Sophia ',
            adultCount: '4',
            discountedCount: '2',
            cuisine: 'asian',
            step: 'contact',
            minDateTime: '2027-06-12T00:00:00.000Z',
            maxDateTime: '2027-06-17T23:59:59.000Z',
        });
        expect(parsed.partnerId).toBe('partner_abc1234567890');
        expect(parsed.firstName).toBe('Sophia');
        expect(parsed.adults).toBe(4);
        expect(parsed.children).toBe(2);
        expect(parsed.cuisine).toBe('asian');
        expect(parsed.step).toBe('contact');
        expect(parsed.minDateTime).toBeDefined();
        expect(parsed.maxDateTime).toBeDefined();
    });

    it('infers cuisine from preferences when cuisine param is missing', () => {
        const parsed = parseBookingRequestPlanSearch({ preferences: 'Mediterran' });
        expect(parsed.cuisine).toBe('mediterranean');
    });
});

describe('bookingRequestPlanResolveVenue', () => {
    const partnerAddress = {
        displayText: 'Andréstraße 30, Offenbach',
        latitude: 50.1,
        longitude: 8.7,
        addressLine1: 'Andréstraße 30',
        addressLine2: '',
        city: 'Offenbach am Main',
        postCode: '63067',
        state: 'Hessen',
        country: 'DE',
    };

    it('prefers URL venue over partner default', () => {
        const search = parseBookingRequestPlanSearch({
            location: 'Kronstraße 30, Frankfurt',
            lat: 50.12,
            lng: 8.69,
            city: 'Frankfurt am Main',
            addressLine1: 'Kronstraße 30',
        });
        const resolved = bookingRequestPlanResolveVenue({ search, partnerDefaultAddress: partnerAddress });
        expect(resolved?.displayText).toBe('Kronstraße 30, Frankfurt');
        expect(resolved?.city).toBe('Frankfurt am Main');
    });

    it('falls back to partner default when URL has no venue', () => {
        const search = parseBookingRequestPlanSearch({ partnerId: 'x' });
        const resolved = bookingRequestPlanResolveVenue({ search, partnerDefaultAddress: partnerAddress });
        expect(resolved).toEqual(partnerAddress);
    });

    it('returns null when neither URL nor partner provides a venue', () => {
        const search = parseBookingRequestPlanSearch({});
        expect(bookingRequestPlanResolveVenue({ search, partnerDefaultAddress: null })).toBeNull();
    });
});

describe('bookingRequestPlanValuesFromSearch / searchFromValues', () => {
    it('round-trips cuisine and guests through URL draft helpers', () => {
        const search = parseBookingRequestPlanSearch({
            adults: 3,
            children: 1,
            cuisine: 'regional',
            firstName: 'Sophia',
            partnerId: 'partner1',
        });
        const values = bookingRequestPlanValuesFromSearch(search);
        expect(values.adultCount).toBe(3);
        expect(values.discountedCount).toBe(1);
        expect(values.cuisine).toBe('regional');
        expect(values.dateTime.getHours()).toBe(19);

        const next = bookingRequestPlanSearchFromValues({
            values,
            step: 'contact',
            partnerId: search.partnerId,
            firstName: search.firstName,
            minDateTime: search.minDateTime,
            maxDateTime: search.maxDateTime,
        });
        expect(next.step).toBe('contact');
        expect(next.cuisine).toBe('regional');
        expect(next.firstName).toBe('Sophia');
        expect(next.partnerId).toBe('partner1');
        expect(bookingRequestPlanSearchEqual(next, { ...next })).toBe(true);
    });
});

describe('bookingRequestPlanSelectableDays', () => {
    it('returns days within min/max bounds', () => {
        const days = bookingRequestPlanSelectableDays({
            minDateTime: new Date('2027-06-12T10:00:00.000Z'),
            maxDateTime: new Date('2027-06-14T20:00:00.000Z'),
        });
        expect(days.length).toBeGreaterThanOrEqual(2);
        expect(days.length).toBeLessThanOrEqual(4);
    });

    it('returns no chip days when the window is open-ended', () => {
        expect(bookingRequestPlanSelectableDays({ minDateTime: undefined, maxDateTime: undefined })).toEqual([]);
        expect(
            bookingRequestPlanSelectableDays({
                minDateTime: new Date('2027-06-12T10:00:00.000Z'),
                maxDateTime: undefined,
            }),
        ).toEqual([]);
    });
});

describe('bookingRequestPlanUsesDateChips', () => {
    it('uses chips only for bounded windows of at most 14 days', () => {
        expect(
            bookingRequestPlanUsesDateChips(
                {
                    minDateTime: new Date('2027-06-01T10:00:00.000Z'),
                    maxDateTime: new Date('2027-06-05T20:00:00.000Z'),
                },
                5,
            ),
        ).toBe(true);
        expect(
            bookingRequestPlanUsesDateChips(
                {
                    minDateTime: new Date('2027-06-01T10:00:00.000Z'),
                    maxDateTime: new Date('2027-07-01T20:00:00.000Z'),
                },
                30,
            ),
        ).toBe(false);
        expect(bookingRequestPlanUsesDateChips({ minDateTime: undefined, maxDateTime: undefined }, 0)).toBe(false);
    });
});
