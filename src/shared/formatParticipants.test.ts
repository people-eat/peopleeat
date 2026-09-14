import { describe, expect, it } from 'vitest';
import { formatParticipants } from './formatParticipants';

describe('formatParticipants', () => {
    it('formats adults only from counts', () => {
        expect(formatParticipants({ adultCount: 4, discountedCount: 0 }, { locale: 'de' })).toBe('4 Erwachsene');
        expect(formatParticipants({ adultCount: 4, discountedCount: 0 }, { locale: 'en' })).toBe('4 adults');
    });

    it('uses singular labels', () => {
        expect(formatParticipants({ adultCount: 1, discountedCount: 1 }, { locale: 'de' })).toBe('1 Erwachsener, 1 Kind');
        expect(formatParticipants({ adultCount: 1, discountedCount: 1 }, { locale: 'en' })).toBe('1 adult, 1 child');
    });

    it('formats from a participant array', () => {
        const participants = [{ type: 'ADULT' }, { type: 'ADULT' }, { type: 'DISCOUNTED' }, { type: 'DISCOUNTED' }, { type: 'DISCOUNTED' }];
        expect(formatParticipants(participants, { locale: 'de' })).toBe('2 Erwachsene, 3 Kinder');
        expect(formatParticipants(participants, { locale: 'en' })).toBe('2 adults, 3 children');
    });
});
