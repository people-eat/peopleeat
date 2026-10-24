import { describe, expect, it } from 'vitest';

import { cookAnalyticsPeriodParse, cookAnalyticsPeriodRange } from './cookAnalyticsPeriod';

describe('cookAnalyticsPeriodRange', () => {
    const now = new Date('2026-10-24T12:00:00.000Z');

    it('resolves past week as 7 days', () => {
        const range = cookAnalyticsPeriodRange('PAST_WEEK', now);
        expect(range.endDateTime.toISOString()).toBe(now.toISOString());
        expect(range.startDateTime.toISOString()).toBe('2026-10-17T12:00:00.000Z');
    });

    it('resolves past month as one calendar month', () => {
        const range = cookAnalyticsPeriodRange('PAST_MONTH', now);
        expect(range.startDateTime.toISOString()).toBe('2026-09-24T12:00:00.000Z');
    });

    it('resolves past quarter as three months', () => {
        const range = cookAnalyticsPeriodRange('PAST_QUARTER', now);
        expect(range.startDateTime.toISOString()).toBe('2026-07-24T12:00:00.000Z');
    });

    it('resolves past year as one calendar year', () => {
        const range = cookAnalyticsPeriodRange('PAST_YEAR', now);
        expect(range.startDateTime.toISOString()).toBe('2025-10-24T12:00:00.000Z');
    });
});

describe('cookAnalyticsPeriodParse', () => {
    it('accepts known periods', () => {
        expect(cookAnalyticsPeriodParse('PAST_MONTH')).toBe('PAST_MONTH');
    });

    it('rejects unknown values', () => {
        expect(cookAnalyticsPeriodParse('PAST_DAY')).toBeUndefined();
        expect(cookAnalyticsPeriodParse(null)).toBeUndefined();
    });
});
