import { describe, expect, it } from 'vitest';

import {
    cookBookingRequestOfferFunnelArea,
    cookBookingRequestOfferFunnelSteps,
    isCookBookingRequestOfferFunnelClientStep,
    isCookBookingRequestOfferFunnelStep,
} from './cookBookingRequestOfferFunnel';

describe('cookBookingRequestOfferFunnel', () => {
    it('exposes a stable area and ordered steps with decline branch before create', () => {
        expect(cookBookingRequestOfferFunnelArea).toBe('cook_booking_request_offer');
        expect(cookBookingRequestOfferFunnelSteps[0]).toBe('notified');
        expect(cookBookingRequestOfferFunnelSteps).toContain('declined');
        expect(cookBookingRequestOfferFunnelSteps.indexOf('declined')).toBeLessThan(
            cookBookingRequestOfferFunnelSteps.indexOf('offer_create'),
        );
        expect(cookBookingRequestOfferFunnelSteps.at(-1)).toBe('created');
    });

    it('validates funnel step ids', () => {
        expect(isCookBookingRequestOfferFunnelStep('notified')).toBe(true);
        expect(isCookBookingRequestOfferFunnelStep('created')).toBe(true);
        expect(isCookBookingRequestOfferFunnelStep('unknown')).toBe(false);
        expect(isCookBookingRequestOfferFunnelClientStep('menus')).toBe(true);
        expect(isCookBookingRequestOfferFunnelClientStep('message')).toBe(true);
        expect(isCookBookingRequestOfferFunnelClientStep('notified')).toBe(false);
        expect(cookBookingRequestOfferFunnelSteps.indexOf('price')).toBeLessThan(cookBookingRequestOfferFunnelSteps.indexOf('message'));
        expect(cookBookingRequestOfferFunnelSteps.indexOf('message')).toBeLessThan(cookBookingRequestOfferFunnelSteps.indexOf('created'));
    });
});
