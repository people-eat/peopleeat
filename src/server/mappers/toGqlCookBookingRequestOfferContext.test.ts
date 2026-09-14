import { config } from 'dotenv';
import { describe, expect, it } from 'vitest';

import type { BookingRequest } from '../db/schema';
import { toGqlCookBookingRequestOfferContext } from './toGqlCookBookingRequestOfferContext';

config({ path: ['.env.test'] });

const invoiceAddress = {
    companyName: 'Acme GmbH',
    firstName: 'Ada',
    lastName: 'Lovelace',
    country: 'DE',
    city: 'Berlin',
    postalCode: '10115',
    line1: 'Street 1',
    line2: '',
};

const bookingRequest = {
    bookingRequestId: 'br-1',
    userId: 'user-1',
    occasion: 'Birthday',
    dateTime: new Date('2026-10-01T18:00:00.000Z'),
    exactEventAddress: {
        displayText: 'Street 1, 10115 Berlin',
        latitude: 52.5,
        longitude: 13.4,
        addressLine1: 'Street 1',
        addressLine2: '',
        city: 'Berlin',
        postCode: '10115',
        state: 'BE',
        country: 'DE',
    },
    priceClassType: 'MEDIUM',
    originalMessage: 'Hello',
    adjustedMessage: null,
    giftCardId: null,
    promoCodeId: null,
    expiresAt: null,
    canceledAt: null,
    cancellationReason: null,
    publicationStatus: 'PUBLICATION_AUTO_APPROVED',
    preferences: [],
    invoiceAddress,
    references: null,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
} satisfies BookingRequest;

const publicUser = {
    display: 'Ada',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    profilePicture: null,
};

describe('toGqlCookBookingRequestOfferContext', () => {
    it('hides invoice address until dual-accept', () => {
        const gql = toGqlCookBookingRequestOfferContext({
            bookingRequest,
            offerCount: 1,
            locale: 'en',
            user: publicUser,
            revealExactEventAddress: false,
        });
        expect(gql.invoiceAddress).toBeNull();
        expect(gql.exactEventAddress.addressLine1).toBe('');
    });

    it('returns invoice address after dual-accept', () => {
        const gql = toGqlCookBookingRequestOfferContext({
            bookingRequest,
            offerCount: 1,
            locale: 'en',
            user: publicUser,
            revealExactEventAddress: true,
        });
        expect(gql.invoiceAddress).toEqual({
            companyName: 'Acme GmbH',
            firstName: 'Ada',
            lastName: 'Lovelace',
            country: 'DE',
            city: 'Berlin',
            postalCode: '10115',
            line1: 'Street 1',
            line2: '',
        });
        expect(gql.exactEventAddress.addressLine1).toBe('Street 1');
    });
});
