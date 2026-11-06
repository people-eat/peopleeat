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

export type BookingRequestFormLocationSettingChoice = 'INDOOR' | 'OUTDOOR' | 'LATER' | 'skipped';

export type BookingRequestFormFunnelInteraction =
    | { type: 'step_entered'; step: BookingRequestFormFunnelStep }
    | {
          type: 'step_completed';
          step: BookingRequestFormFunnelStep;
          /** Present on the location step when `BOOKING_REQUEST_SETTING` is on. */
          setting?: BookingRequestFormLocationSettingChoice;
      };

export function isBookingRequestFormFunnelStep(value: string): value is BookingRequestFormFunnelStep {
    return (bookingRequestFormFunnelSteps as readonly string[]).includes(value);
}
