import { describe, expect, it } from 'vitest';

import { DATE_TIME_RANGE_MAX_SPAN_MS, dateTimeRangeNormalize } from './dateTimeRangeNormalize';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

describe('dateTimeRangeNormalize', () => {
    it('returns parsed dates when the range is valid', () => {
        const startDateTime = new Date('2026-08-01T00:00:00.000Z');
        const endDateTime = new Date('2026-09-30T23:59:59.999Z');

        expect(dateTimeRangeNormalize({ startDateTime, endDateTime })).toEqual({ startDateTime, endDateTime });
    });

    it('rejects inverted ranges', () => {
        expect(() =>
            dateTimeRangeNormalize({
                startDateTime: new Date('2026-09-01T00:00:00.000Z'),
                endDateTime: new Date('2026-08-01T00:00:00.000Z'),
            }),
        ).toThrow(/startDateTime must be <= endDateTime/);
    });

    it('rejects spans longer than 366 days', () => {
        const startDateTime = new Date('2025-01-01T00:00:00.000Z');
        const endDateTime = new Date(startDateTime.getTime() + DATE_TIME_RANGE_MAX_SPAN_MS + MS_PER_DAY);

        expect(() => dateTimeRangeNormalize({ startDateTime, endDateTime })).toThrow(/exceeds 366 days/);
    });
});
