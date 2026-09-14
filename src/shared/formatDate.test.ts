import { describe, expect, it } from 'vitest';
import { formatDate, formatDateRange, formatDateTime, formatMonthYear, formatTime } from './formatDate';
import { formatIsoDate } from './formatIsoDate';

describe('formatDate', () => {
    it('formats an ISO date-only string as a local calendar date', () => {
        const de = formatDate('2026-03-15', { locale: 'de' });
        const en = formatDate('2026-03-15', { locale: 'en' });
        expect(de).toMatch(/15/);
        expect(de).toMatch(/2026/);
        expect(en).toMatch(/Mar/);
        expect(en).toMatch(/15/);
    });

    it('returns an em dash for null', () => {
        expect(formatDate(null, { locale: 'en' })).toBe('—');
    });

    it('supports short date style', () => {
        const formatted = formatDate(new Date(2026, 2, 15), { locale: 'de', dateStyle: 'short' });
        expect(formatted).toMatch(/15/);
        expect(formatted).toMatch(/03|3/);
        expect(formatted).toMatch(/26|2026/);
    });

    it('supports full date style', () => {
        const formatted = formatDate('2026-03-15', { locale: 'en', dateStyle: 'full' });
        expect(formatted.toLowerCase()).toMatch(/sunday|sun/);
        expect(formatted).toMatch(/15/);
        expect(formatted).toMatch(/2026/);
    });

    it('includes weekday when requested', () => {
        const formatted = formatDate('2026-03-15', { locale: 'en', weekday: true });
        expect(formatted.toLowerCase()).toMatch(/sunday|sun/);
    });

    it('honors an explicit timeZone', () => {
        // 2026-03-15T23:30:00Z is still Mar 15 in UTC, already Mar 16 in Berlin (CET+1 / CEST+2).
        const utc = formatDate('2026-03-15T23:30:00.000Z', { locale: 'en', dateStyle: 'medium', timeZone: 'UTC' });
        const berlin = formatDate('2026-03-15T23:30:00.000Z', {
            locale: 'en',
            dateStyle: 'medium',
            timeZone: 'Europe/Berlin',
        });
        expect(utc).toMatch(/15/);
        expect(berlin).toMatch(/16/);
    });
});

describe('formatTime', () => {
    it('formats short time', () => {
        const formatted = formatTime('2026-03-15T18:30:00.000Z', { locale: 'en', timeZone: 'UTC' });
        expect(formatted).toMatch(/6:30|18:30/);
    });

    it('returns an em dash for null', () => {
        expect(formatTime(null, { locale: 'de' })).toBe('—');
    });
});

describe('formatDateTime', () => {
    it('combines date and time styles', () => {
        const formatted = formatDateTime('2026-03-15T18:30:00.000Z', {
            locale: 'en',
            dateStyle: 'full',
            timeStyle: 'short',
            timeZone: 'UTC',
        });
        expect(formatted.toLowerCase()).toMatch(/sunday|sun/);
        expect(formatted).toMatch(/15/);
        expect(formatted).toMatch(/6:30|18:30/);
    });

    it('supports weekday with Berlin timezone', () => {
        const formatted = formatDateTime('2026-03-15T18:30:00.000Z', {
            locale: 'de',
            weekday: true,
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: 'Europe/Berlin',
        });
        expect(formatted.toLowerCase()).toMatch(/sonntag|so/);
        expect(formatted).toMatch(/19:30|7:30/);
    });
});

describe('formatDateRange', () => {
    it('joins both ends with an en dash', () => {
        const formatted = formatDateRange('2026-03-01', '2026-03-15', { locale: 'en' });
        expect(formatted).toContain('–');
        expect(formatted).toMatch(/Mar/);
    });

    it('prefixes open-ended starts and ends', () => {
        expect(formatDateRange('2026-03-01', null, { locale: 'de', openEnded: true })).toMatch(/^ab /);
        expect(formatDateRange(null, '2026-03-15', { locale: 'en', openEnded: true })).toMatch(/^until /);
    });

    it('returns em dash when both ends are missing', () => {
        expect(formatDateRange(null, undefined, { locale: 'de' })).toBe('—');
    });
});

describe('formatMonthYear', () => {
    it('formats short and long month styles', () => {
        expect(formatMonthYear('2026-07-01', { locale: 'en' })).toMatch(/Jul/);
        expect(formatMonthYear('2026-07-01', { locale: 'en', month: 'long' })).toMatch(/July/);
    });
});

describe('formatIsoDate', () => {
    it('formats a local Date without UTC shift', () => {
        expect(formatIsoDate(new Date(2026, 2, 15))).toBe('2026-03-15');
    });
});
