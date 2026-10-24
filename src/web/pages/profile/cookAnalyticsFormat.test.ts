import { describe, expect, it } from 'vitest';

import {
    cookAnalyticsFormatAverageParticipants,
    cookAnalyticsFormatDurationMinutes,
    cookAnalyticsFormatMenuPrice,
    cookAnalyticsFormatPercent,
} from './cookAnalyticsFormat';

describe('cookAnalyticsFormatDurationMinutes', () => {
    it('returns n/a for missing values', () => {
        expect(cookAnalyticsFormatDurationMinutes(null, 'en')).toBe('n/a');
        expect(cookAnalyticsFormatDurationMinutes(undefined, 'de')).toBe('k. A.');
    });

    it('formats under one minute', () => {
        expect(cookAnalyticsFormatDurationMinutes(0.4, 'en')).toBe('under 1 min');
    });

    it('formats minutes and hours', () => {
        expect(cookAnalyticsFormatDurationMinutes(15, 'en')).toBe('15 min');
        expect(cookAnalyticsFormatDurationMinutes(125, 'en')).toBe('2h 5m');
        expect(cookAnalyticsFormatDurationMinutes(60 * 24 * 3, 'de')).toBe('3 Tage');
    });
});

describe('cookAnalyticsFormatPercent', () => {
    it('formats ratios as whole percents', () => {
        expect(cookAnalyticsFormatPercent(0.255, 'en')).toBe('26\u00a0%');
        expect(cookAnalyticsFormatPercent(null, 'en')).toBe('n/a');
    });
});

describe('cookAnalyticsFormatAverageParticipants', () => {
    it('formats with at most one decimal', () => {
        expect(cookAnalyticsFormatAverageParticipants(3.25, 'en')).toBe('3.3');
        expect(cookAnalyticsFormatAverageParticipants(null, 'de')).toBe('k. A.');
    });
});

describe('cookAnalyticsFormatMenuPrice', () => {
    it('formats cents as whole euros', () => {
        expect(cookAnalyticsFormatMenuPrice(4500, 'en')).toMatch(/45/);
        expect(cookAnalyticsFormatMenuPrice(null, 'en')).toBe('n/a');
    });
});
