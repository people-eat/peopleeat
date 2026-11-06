import { describe, expect, it } from 'vitest';

import { bookingRequestFormFunnelArea, bookingRequestFormFunnelSteps, isBookingRequestFormFunnelStep } from './bookingRequestFormFunnel';

describe('bookingRequestFormFunnel', () => {
    it('exposes a stable area and ordered steps ending in created', () => {
        expect(bookingRequestFormFunnelArea).toBe('booking_request_form');
        expect(bookingRequestFormFunnelSteps[0]).toBe('occasion');
        expect(bookingRequestFormFunnelSteps.at(-1)).toBe('created');
    });

    it('validates funnel step ids', () => {
        expect(isBookingRequestFormFunnelStep('occasion')).toBe(true);
        expect(isBookingRequestFormFunnelStep('created')).toBe(true);
        expect(isBookingRequestFormFunnelStep('unknown')).toBe(false);
    });

    it('does not add a dedicated setting funnel step', () => {
        expect(bookingRequestFormFunnelSteps).not.toContain('setting');
        expect(isBookingRequestFormFunnelStep('setting')).toBe(false);
    });
});
