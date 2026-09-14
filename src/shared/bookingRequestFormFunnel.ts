/**
 * Stable booking-request form funnel step ids shared by client instrumentation
 * and admin Sankey aggregation. See docs/architecture/session-events.md.
 */

export const bookingRequestFormFunnelSteps = [
    'occasion',
    'participants',
    'location',
    'dateTime',
    'priceClass',
    'preferences',
    'restrictions',
    'message',
    'auth',
    'created',
] as const;

export type BookingRequestFormFunnelStep = (typeof bookingRequestFormFunnelSteps)[number];

export const bookingRequestFormFunnelArea = 'booking_request_form' as const;

export type BookingRequestFormFunnelInteraction =
    { type: 'step_entered'; step: BookingRequestFormFunnelStep } | { type: 'step_completed'; step: BookingRequestFormFunnelStep };

export function isBookingRequestFormFunnelStep(value: string): value is BookingRequestFormFunnelStep {
    return (bookingRequestFormFunnelSteps as readonly string[]).includes(value);
}
