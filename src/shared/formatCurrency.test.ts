import { describe, expect, it } from 'vitest';
import { formatCurrency } from './formatCurrency';

describe('formatCurrency', () => {
    it('always shows 2 fraction digits by default (de)', () => {
        expect(formatCurrency(123400, { locale: 'de' })).toMatch(/1\.234,00\s*€/);
    });

    it('formats cents in English (en-US)', () => {
        expect(formatCurrency(123456, { locale: 'en' })).toBe('€1,234.56');
    });

    it('allows whole euros when maximumFractionDigits is 0', () => {
        expect(formatCurrency(123456, { locale: 'de', maximumFractionDigits: 0 })).toMatch(/1\.235\s*€/);
    });

    it('falls back to localized cents under 1 euro', () => {
        expect(formatCurrency(35, { locale: 'de' })).toBe('35 Cent');
        expect(formatCurrency(1, { locale: 'en' })).toBe('1 cent');
        expect(formatCurrency(35, { locale: 'en' })).toBe('35 cents');
        expect(formatCurrency(-35, { locale: 'en' })).toBe('-35 cents');
    });

    it('keeps euro formatting at exactly 1 euro and at zero', () => {
        expect(formatCurrency(100, { locale: 'en' })).toBe('€1.00');
        expect(formatCurrency(0, { locale: 'en' })).toBe('€0.00');
    });

    it('treats null as zero by default', () => {
        expect(formatCurrency(null, { locale: 'en' })).toBe('€0.00');
    });

    it('returns an em dash when nullAs is emDash', () => {
        expect(formatCurrency(undefined, { locale: 'de', nullAs: 'emDash' })).toBe('—');
    });

    it('returns empty string when nullAs is empty', () => {
        expect(formatCurrency(null, { locale: 'de', nullAs: 'empty' })).toBe('');
    });
});
