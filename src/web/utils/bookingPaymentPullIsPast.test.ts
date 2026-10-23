import { describe, expect, it } from 'vitest';

import { bookingPaymentPullIsPast } from './bookingPaymentPullIsPast';

describe('bookingPaymentPullIsPast', () => {
    const now = new Date('2026-10-23T12:00:00.000Z');

    it('returns false when the planned pull is missing', () => {
        expect(bookingPaymentPullIsPast(null, now)).toBe(false);
        expect(bookingPaymentPullIsPast(undefined, now)).toBe(false);
    });

    it('returns true when the planned pull is already due', () => {
        expect(bookingPaymentPullIsPast('2026-10-23T11:59:59.000Z', now)).toBe(true);
        expect(bookingPaymentPullIsPast(now, now)).toBe(true);
    });

    it('returns false when the planned pull is still in the future', () => {
        expect(bookingPaymentPullIsPast('2026-10-23T12:00:01.000Z', now)).toBe(false);
    });
});
