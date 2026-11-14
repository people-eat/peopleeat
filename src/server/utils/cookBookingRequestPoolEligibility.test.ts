import { describe, expect, it } from 'vitest';

import type { BookingRequest, Cook } from '../db/schema';
import { cookIsEligibleForBookingRequestPool } from './cookBookingRequestPoolEligibility';

const berlin = {
    displayText: 'Berlin',
    latitude: 52.52,
    longitude: 13.405,
    addressLine1: 'Street 1',
    addressLine2: '',
    city: 'Berlin',
    postCode: '10115',
    state: 'BE',
    country: 'DE',
};

const cook = {
    cookId: 'cook-1',
    exactTravelOriginAddress: berlin,
    maximumTravelDistance: 50,
} as Cook;

function request(overrides: Partial<Pick<BookingRequest, 'userId' | 'publicationStatus' | 'requestedCookId' | 'exactEventAddress'>> = {}) {
    return {
        userId: 'customer-1',
        publicationStatus: 'PUBLICATION_DIRECT_TO_COOK' as const,
        requestedCookId: 'cook-1',
        exactEventAddress: berlin,
        ...overrides,
    };
}

describe('cookIsEligibleForBookingRequestPool', () => {
    it('shows exclusive chef-page rows only when notified', () => {
        expect(cookIsEligibleForBookingRequestPool(cook, request(), { notifiedAt: new Date() })).toBe(true);
        expect(cookIsEligibleForBookingRequestPool(cook, request(), { notifiedAt: null })).toBe(false);
        expect(cookIsEligibleForBookingRequestPool({ ...cook, cookId: 'other-cook' }, request(), null)).toBe(false);
    });

    it('keeps the requested cook after expand even outside radius', () => {
        const farEvent = { ...berlin, latitude: 48.13, longitude: 11.57 };
        expect(
            cookIsEligibleForBookingRequestPool(
                cook,
                request({ publicationStatus: 'PUBLICATION_AUTO_APPROVED', exactEventAddress: farEvent }),
                { notifiedAt: new Date() },
            ),
        ).toBe(true);
    });
});
