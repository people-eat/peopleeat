import { describe, expect, it } from 'vitest';

import {
    bookingRequestPriceClassInfo,
    bookingRequestPriceClassLabel,
    bookingRequestPriceClassTypes,
    defaultBookingRequestDateTime,
    defaultBookingRequestOccasions,
    defaultBookingRequestPreferences,
} from './bookingRequestFormDefaults';

describe('bookingRequestFormDefaults', () => {
    it('returns bilingual occasion and preference lists', () => {
        expect(defaultBookingRequestOccasions('de')).toContain('Geburtstag');
        expect(defaultBookingRequestOccasions('en')).toContain('Birthday');
        expect(defaultBookingRequestPreferences('de')).toContain('Vegetarisch');
        expect(defaultBookingRequestPreferences('en')).toContain('Vegetarian');
    });

    it('describes every price class', () => {
        for (const type of bookingRequestPriceClassTypes) {
            const info = bookingRequestPriceClassInfo(type, 'de');
            expect(info.title.length).toBeGreaterThan(0);
            expect(info.minimumAmountPerPersonCents).toBeGreaterThan(0);
        }
        expect(bookingRequestPriceClassInfo('MEDIUM', 'en').isPopular).toBe(true);
    });

    it('formats a compact price-class label with the from-price', () => {
        expect(bookingRequestPriceClassLabel('HIGH', 'de')).toMatch(/^Prestige Experience \(ab .+ p\.P\.\)$/);
        expect(bookingRequestPriceClassLabel('HIGH', 'en')).toMatch(/^Prestige Experience \(from .+ p\.p\.\)$/);
    });

    it('defaults dateTime about three weeks out at 19:00 local', () => {
        const now = new Date('2030-01-01T12:00:00');
        const next = defaultBookingRequestDateTime(now);
        expect(next.getDate()).toBe(22);
        expect(next.getHours()).toBe(19);
        expect(next.getMinutes()).toBe(0);
    });
});
