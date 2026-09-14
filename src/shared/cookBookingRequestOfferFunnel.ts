/**
 * Stable cook booking-request → offer funnel step ids shared by client
 * instrumentation and admin Sankey aggregation (cook × request grain).
 * See docs/architecture/session-events.md and docs/features/admin-analytics.md.
 */

export const cookBookingRequestOfferFunnelSteps = ['notified', 'opened', 'declined', 'offer_create', 'menus', 'price', 'created'] as const;

export type CookBookingRequestOfferFunnelStep = (typeof cookBookingRequestOfferFunnelSteps)[number];

/** Client-emitted create-UI steps (DB timestamps cover notified/opened/declined/created). */
const cookBookingRequestOfferFunnelClientSteps = ['offer_create', 'menus', 'price'] as const;

export type CookBookingRequestOfferFunnelClientStep = (typeof cookBookingRequestOfferFunnelClientSteps)[number];

export const cookBookingRequestOfferFunnelArea = 'cook_booking_request_offer' as const;

export type CookBookingRequestOfferFunnelInteraction =
    | { type: 'step_entered'; step: CookBookingRequestOfferFunnelClientStep }
    | { type: 'step_completed'; step: CookBookingRequestOfferFunnelClientStep };

export function isCookBookingRequestOfferFunnelStep(value: string): value is CookBookingRequestOfferFunnelStep {
    return (cookBookingRequestOfferFunnelSteps as readonly string[]).includes(value);
}

export function isCookBookingRequestOfferFunnelClientStep(value: string): value is CookBookingRequestOfferFunnelClientStep {
    return (cookBookingRequestOfferFunnelClientSteps as readonly string[]).includes(value);
}
