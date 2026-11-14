import { describe, expect, it } from 'vitest';

import {
    BOOKING_REQUEST_MARKET_CLOSED_ERROR,
    bookingRequestMarketClosedAssert,
    bookingRequestMarketClosedFromMessage,
    expansionMarketCityList,
    expansionMarketFromCountry,
    expansionMarketFromParam,
    placesRegionCodeNormalize,
} from './expansionMarkets';

describe('expansionMarketFromParam', () => {
    it('allowlists netherlands and switzerland', () => {
        expect(expansionMarketFromParam('netherlands')?.countryCode).toBe('NL');
        expect(expansionMarketFromParam('switzerland')?.countryCode).toBe('CH');
        expect(expansionMarketFromParam('germany')).toBeNull();
        expect(expansionMarketFromParam('nl')).toBeNull();
    });
});

describe('expansionMarketFromCountry', () => {
    it('maps ISO codes and long names', () => {
        expect(expansionMarketFromCountry('NL')?.slug).toBe('netherlands');
        expect(expansionMarketFromCountry('Netherlands')?.slug).toBe('netherlands');
        expect(expansionMarketFromCountry('CH')?.slug).toBe('switzerland');
        expect(expansionMarketFromCountry('Schweiz')?.slug).toBe('switzerland');
        expect(expansionMarketFromCountry('DE')).toBeNull();
    });
});

describe('expansionMarketCityList', () => {
    it('joins city names for SEO copy', () => {
        const netherlands = expansionMarketFromParam('netherlands');
        expect(netherlands).not.toBeNull();
        expect(expansionMarketCityList(netherlands!, 'en')).toContain('Amsterdam');
        expect(expansionMarketCityList(netherlands!, 'de')).toContain('Den Haag');
    });
});

describe('placesRegionCodeNormalize', () => {
    it('accepts ISO alpha-2 and defaults to DE', () => {
        expect(placesRegionCodeNormalize('nl')).toBe('NL');
        expect(placesRegionCodeNormalize('CH')).toBe('CH');
        expect(placesRegionCodeNormalize('')).toBe('DE');
        expect(placesRegionCodeNormalize('NLD')).toBe('DE');
    });
});

describe('bookingRequestMarketClosedAssert', () => {
    it('throws a parseable closed-market error for NL and CH', () => {
        expect(() => bookingRequestMarketClosedAssert('NL', 'userBookingRequestCreate')).toThrow(
            `${BOOKING_REQUEST_MARKET_CLOSED_ERROR}:netherlands`,
        );
        expect(bookingRequestMarketClosedFromMessage('userBookingRequestCreate: bookingRequestMarketClosed:switzerland')?.slug).toBe(
            'switzerland',
        );
        expect(() => bookingRequestMarketClosedAssert('DE', 'userBookingRequestCreate')).not.toThrow();
        expect(bookingRequestMarketClosedFromMessage('userBookingRequestCreate: exactEventAddress is incomplete')).toBeNull();
    });
});
