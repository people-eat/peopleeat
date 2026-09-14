import { describe, expect, it } from 'vitest';

import { formatInboxListTimestamp } from './formatInboxListTimestamp';

describe('formatInboxListTimestamp', () => {
    const timeZone = 'Europe/Berlin';
    const now = new Date('2026-10-14T15:00:00.000Z');

    it('returns time for the same local calendar day', () => {
        expect(formatInboxListTimestamp('2026-10-14T10:30:00.000Z', { locale: 'en', timeZone, now })).toMatch(/\d/);
        expect(formatInboxListTimestamp('2026-10-14T10:30:00.000Z', { locale: 'de', timeZone, now })).toMatch(/\d/);
    });

    it('returns Yesterday / Gestern for the previous local calendar day', () => {
        expect(formatInboxListTimestamp('2026-10-13T12:00:00.000Z', { locale: 'en', timeZone, now })).toBe('Yesterday');
        expect(formatInboxListTimestamp('2026-10-13T12:00:00.000Z', { locale: 'de', timeZone, now })).toBe('Gestern');
    });

    it('returns weekday for 2–6 local days ago', () => {
        // 2026-10-12 is Monday in Europe/Berlin
        expect(formatInboxListTimestamp('2026-10-12T12:00:00.000Z', { locale: 'en', timeZone, now })).toBe('Monday');
        expect(formatInboxListTimestamp('2026-10-12T12:00:00.000Z', { locale: 'de', timeZone, now })).toBe('Montag');
    });

    it('returns a short date for older timestamps', () => {
        const label = formatInboxListTimestamp('2026-09-01T12:00:00.000Z', { locale: 'en', timeZone, now });
        expect(label).not.toBe('Yesterday');
        expect(label).toMatch(/2026|9|1/);
    });
});
