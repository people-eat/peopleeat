import { describe, expect, it } from 'vitest';

import { bookingRequestDirectNeedsExpansion, bookingRequestIsExclusive } from './bookingRequest';
import { cookCanReceiveDirectBookingRequests } from './cook';

describe('bookingRequestIsExclusive', () => {
    it('is true only for chef-page publication', () => {
        expect(bookingRequestIsExclusive('PUBLICATION_DIRECT_TO_COOK')).toBe(true);
        expect(bookingRequestIsExclusive('PUBLICATION_AUTO_APPROVED')).toBe(false);
        expect(bookingRequestIsExclusive('PUBLICATION_APPROVED_BY_ADMIN')).toBe(false);
        expect(bookingRequestIsExclusive('PUBLICATION_BLOCKED_BY_ADMIN_REVIEW')).toBe(false);
    });
});

describe('bookingRequestDirectNeedsExpansion', () => {
    it('is false while exclusive and waiting with no decline', () => {
        expect(
            bookingRequestDirectNeedsExpansion({
                publicationStatus: 'PUBLICATION_DIRECT_TO_COOK',
                requestedCookDeclined: false,
                requestedCookBanned: false,
                offers: [],
            }),
        ).toBe(false);
    });

    it('is true after the requested cook declines with no live offer', () => {
        expect(
            bookingRequestDirectNeedsExpansion({
                publicationStatus: 'PUBLICATION_DIRECT_TO_COOK',
                requestedCookDeclined: true,
                requestedCookBanned: false,
                offers: [],
            }),
        ).toBe(true);
    });

    it('is false when a live offer still exists', () => {
        expect(
            bookingRequestDirectNeedsExpansion({
                publicationStatus: 'PUBLICATION_DIRECT_TO_COOK',
                requestedCookDeclined: false,
                requestedCookBanned: false,
                offers: [{ cookAccepted: true, userAccepted: null }],
            }),
        ).toBe(false);
    });

    it('is false after expand', () => {
        expect(
            bookingRequestDirectNeedsExpansion({
                publicationStatus: 'PUBLICATION_AUTO_APPROVED',
                requestedCookDeclined: true,
                requestedCookBanned: false,
                offers: [],
            }),
        ).toBe(false);
    });
});

describe('cookCanReceiveDirectBookingRequests', () => {
    const readyCook = {
        isApprovedByAdmin: true,
        isVisible: true,
        exactTravelOriginAddress: { city: 'Berlin' },
        stripeAccountId: 'acct_1',
        stripeAccountActive: true,
        stripeAccountActiveWasReset: false,
    };

    it('requires a public, offer-ready cook with a travel origin', () => {
        expect(cookCanReceiveDirectBookingRequests(readyCook, 'ACTIVE')).toBe(true);
        expect(cookCanReceiveDirectBookingRequests({ ...readyCook, isVisible: false }, 'ACTIVE')).toBe(false);
        expect(cookCanReceiveDirectBookingRequests({ ...readyCook, exactTravelOriginAddress: null }, 'ACTIVE')).toBe(false);
        expect(cookCanReceiveDirectBookingRequests({ ...readyCook, stripeAccountActive: false }, 'ACTIVE')).toBe(false);
        expect(cookCanReceiveDirectBookingRequests(readyCook, 'BANNED')).toBe(false);
    });
});
