import { describe, expect, it } from 'vitest';

import {
    formatBookingCallScheduleCaption,
    formatBookingCallWhen,
    formatBookingEventDate,
    formatBookingEventWhen,
    formatBookingEventWhenAdmin,
    formatBookingWhenJoined,
} from './formatBookingWhen';

const berlinDinner = '2026-03-15T18:00:00.000Z'; // 19:00 CET
const callStart = '2026-06-02T16:00:00.000Z';
const callEnd = '2026-06-02T16:15:00.000Z';

describe('formatBookingEventWhen', () => {
    it('keeps a single unlabeled line when viewer and venue share an offset', () => {
        const formatted = formatBookingEventWhen({
            instant: berlinDinner,
            locale: 'de',
            viewerTimeZone: 'Europe/Berlin',
            venueTimeZone: 'Europe/Zurich',
            venueCity: 'München',
        });
        expect(formatted.secondary).toBeUndefined();
        expect(formatted.primary).toMatch(/19:00/);
        expect(formatted.primary).not.toContain('München');
    });

    it('adds the venue city and the viewer local time when offsets differ', () => {
        const formatted = formatBookingEventWhen({
            instant: berlinDinner,
            locale: 'en',
            viewerTimeZone: 'America/New_York',
            venueTimeZone: 'Europe/Berlin',
            venueCity: 'München',
        });
        expect(formatted.primary).toMatch(/in München/);
        expect(formatted.secondary).toMatch(/in your time zone/);
        expect(formatted.secondary).toMatch(/2:00|14:00/);
    });
});

describe('formatBookingEventWhenAdmin', () => {
    it('lists each party whose offset differs from the venue', () => {
        const formatted = formatBookingEventWhenAdmin({
            instant: berlinDinner,
            locale: 'en',
            venueTimeZone: 'Europe/Berlin',
            venueCity: 'Berlin',
            customerTimeZone: 'America/New_York',
            cookTimeZone: 'Europe/Berlin',
        });
        expect(formatted.primary).toMatch(/in Berlin/);
        expect(formatted.secondary).toMatch(/Customer/);
        expect(formatted.secondary).toContain('America/New_York');
        expect(formatted.secondary).not.toMatch(/Chef/);
    });
});

describe('formatBookingCallWhen', () => {
    it('adds a peer line only when offsets differ', () => {
        const same = formatBookingCallWhen({
            startAt: callStart,
            endAt: callEnd,
            locale: 'de',
            viewerTimeZone: 'Europe/Berlin',
            peers: [{ name: 'Anna', timeZone: 'Europe/Zurich' }],
        });
        expect(same.secondary).toBeUndefined();

        const mismatched = formatBookingCallWhen({
            startAt: callStart,
            endAt: callEnd,
            locale: 'en',
            viewerTimeZone: 'Europe/Berlin',
            peers: [{ name: 'Anna', timeZone: 'America/New_York' }],
        });
        expect(mismatched.secondary).toMatch(/for Anna \(New York\)/);
    });
});

describe('formatBookingCallScheduleCaption', () => {
    it('returns null when offsets match', () => {
        expect(
            formatBookingCallScheduleCaption({
                locale: 'en',
                viewerTimeZone: 'Europe/Berlin',
                peers: [{ name: 'Anna', timeZone: 'Europe/Paris' }],
                instant: callStart,
            }),
        ).toBeNull();
    });

    it('names the peer city and relative offset', () => {
        const caption = formatBookingCallScheduleCaption({
            locale: 'de',
            viewerTimeZone: 'Europe/Berlin',
            peers: [{ name: 'Anna', timeZone: 'America/New_York' }],
            instant: '2026-01-15T18:00:00.000Z',
        });
        expect(caption).toMatch(/^Zeiten in deiner Zeitzone\./);
        expect(caption).toContain('Anna ist in New York');
        expect(caption).toContain('6 Stunden hinter dir');
    });
});

describe('formatBookingEventDate', () => {
    it('uses the venue zone so a late UTC evening stays on the venue calendar day', () => {
        const late = '2026-03-15T23:30:00.000Z';
        expect(formatBookingEventDate({ instant: late, locale: 'en', venueTimeZone: 'UTC' })).toMatch(/15/);
        expect(formatBookingEventDate({ instant: late, locale: 'en', venueTimeZone: 'Europe/Berlin' })).toMatch(/16/);
    });
});

describe('formatBookingWhenJoined', () => {
    it('joins with a middle dot when a secondary line exists', () => {
        expect(formatBookingWhenJoined({ primary: 'A', secondary: 'B' })).toBe('A · B');
        expect(formatBookingWhenJoined({ primary: 'A' })).toBe('A');
    });
});
