import { describe, expect, it } from 'vitest';

import { formatTimeZonePlaceLabel, timeZoneFromCountry, timeZoneOffsetAt, timeZonesDifferAt } from './timeZone';

const winter = '2026-01-15T18:00:00.000Z';
const summer = '2026-07-15T18:00:00.000Z';

describe('timeZoneOffsetAt', () => {
    it('returns CET in Berlin winter and CEST in summer', () => {
        expect(timeZoneOffsetAt(winter, 'Europe/Berlin')).toBe(60);
        expect(timeZoneOffsetAt(summer, 'Europe/Berlin')).toBe(120);
    });

    it('returns Eastern Standard Time for New York in January', () => {
        expect(timeZoneOffsetAt(winter, 'America/New_York')).toBe(-300);
    });
});

describe('timeZonesDifferAt', () => {
    it('treats Berlin and Zurich as the same offset', () => {
        expect(timeZonesDifferAt(winter, 'Europe/Berlin', 'Europe/Zurich')).toBe(false);
        expect(timeZonesDifferAt(summer, 'Europe/Berlin', 'Europe/Paris')).toBe(false);
    });

    it('detects Berlin vs New York', () => {
        expect(timeZonesDifferAt(winter, 'Europe/Berlin', 'America/New_York')).toBe(true);
    });
});

describe('timeZoneFromCountry', () => {
    it('maps DACH ISO codes and long names', () => {
        expect(timeZoneFromCountry('DE')).toBe('Europe/Berlin');
        expect(timeZoneFromCountry('at')).toBe('Europe/Vienna');
        expect(timeZoneFromCountry('Schweiz')).toBe('Europe/Zurich');
        expect(timeZoneFromCountry('Deutschland')).toBe('Europe/Berlin');
    });

    it('falls back to Berlin when the country is unknown', () => {
        expect(timeZoneFromCountry('')).toBe('Europe/Berlin');
        expect(timeZoneFromCountry('Narnia')).toBe('Europe/Berlin');
        expect(timeZoneFromCountry(null)).toBe('Europe/Berlin');
    });
});

describe('formatTimeZonePlaceLabel', () => {
    it('uses the last IANA segment as a city', () => {
        expect(formatTimeZonePlaceLabel('Europe/Berlin')).toBe('Berlin');
        expect(formatTimeZonePlaceLabel('America/New_York')).toBe('New York');
        expect(formatTimeZonePlaceLabel('America/Argentina/Buenos_Aires')).toBe('Buenos Aires');
    });
});
