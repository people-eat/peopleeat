/**
 * Stable booking-request checkout funnel step ids shared by client
 * instrumentation and admin Sankey aggregation.
 * See docs/architecture/session-events.md.
 */

export const bookingRequestCheckoutFunnelSteps = ['checkout', 'paid'] as const;

export type BookingRequestCheckoutFunnelStep = (typeof bookingRequestCheckoutFunnelSteps)[number];

/** Client-emitted mid-funnel steps (lifecycle events cover paid). */
const bookingRequestCheckoutFunnelClientSteps = ['checkout'] as const;

export type BookingRequestCheckoutFunnelClientStep = (typeof bookingRequestCheckoutFunnelClientSteps)[number];

export const bookingRequestCheckoutFunnelArea = 'booking_request_checkout' as const;

export type BookingRequestCheckoutFunnelInteraction =
    | { type: 'step_entered'; step: BookingRequestCheckoutFunnelClientStep }
    | { type: 'step_completed'; step: BookingRequestCheckoutFunnelClientStep };

export function isBookingRequestCheckoutFunnelClientStep(value: string): value is BookingRequestCheckoutFunnelClientStep {
    return (bookingRequestCheckoutFunnelClientSteps as readonly string[]).includes(value);
}
