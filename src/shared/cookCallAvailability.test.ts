import { describe, expect, it } from 'vitest';

import { formatMinuteOfDay, isCookCallDurationMinutes, parseMinuteOfDay } from './cookCallAvailability';

describe('cookCallAvailability helpers', () => {
    it('formats and parses minute-of-day', () => {
        expect(formatMinuteOfDay(0)).toBe('00:00');
        expect(formatMinuteOfDay(600)).toBe('10:00');
        expect(formatMinuteOfDay(1439)).toBe('23:59');
        expect(parseMinuteOfDay('10:00')).toBe(600);
        expect(parseMinuteOfDay('23:59')).toBe(1439);
        expect(parseMinuteOfDay('bad')).toBeNull();
    });

    it('validates allowed call durations', () => {
        expect(isCookCallDurationMinutes(30)).toBe(true);
        expect(isCookCallDurationMinutes(20)).toBe(false);
    });
});
