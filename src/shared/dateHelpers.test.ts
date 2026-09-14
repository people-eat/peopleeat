import { describe, expect, it } from 'vitest';

import { dateAddDays } from './dateAddDays';
import { dateDistanceInDays } from './dateDistanceInDays';
import { dateDistanceInDaysToToday } from './dateDistanceInDaysToToday';
import { toLocalCalendarDate } from './toLocalCalendarDate';

describe('date helpers', () => {
    it('dateAddDays shifts calendar days', () => {
        const base = new Date('2026-01-10T12:00:00.000Z');
        expect(dateAddDays(base, 2).toISOString()).toBe('2026-01-12T12:00:00.000Z');
        expect(dateAddDays(base, -14).toISOString()).toBe('2025-12-27T12:00:00.000Z');
    });

    it('toLocalCalendarDate uses the zone calendar day', () => {
        // 15:00 UTC is still 2026-01-10 in Berlin (UTC+1/+2), already 2026-01-11 in Tokyo (UTC+9).
        const utcAfternoon = new Date('2026-01-10T15:00:00.000Z');
        expect(toLocalCalendarDate(utcAfternoon, 'Europe/Berlin').toISOString()).toBe('2026-01-10T00:00:00.000Z');
        expect(toLocalCalendarDate(utcAfternoon, 'Asia/Tokyo').toISOString()).toBe('2026-01-11T00:00:00.000Z');
    });

    it('dateDistanceInDays is calendar-day based', () => {
        const a = new Date('2026-01-20T10:00:00.000Z');
        const b = new Date('2026-01-10T22:00:00.000Z');
        expect(dateDistanceInDays(a, b, 'Europe/Berlin')).toBe(10);
    });

    it('dateDistanceInDaysToToday returns signed distance from today', () => {
        const tomorrow = dateAddDays(new Date(), 1);
        expect(dateDistanceInDaysToToday(tomorrow, 'Europe/Berlin')).toBe(1);
    });
});
