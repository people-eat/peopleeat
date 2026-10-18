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
