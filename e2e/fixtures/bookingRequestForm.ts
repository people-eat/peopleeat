import { berlinAddress } from './db';

/**
 * Prefills `/booking-request/form` via URL search so e2e skips Places autocomplete
 * and most wizard steps. Lands on the message (or auth) step with a valid draft.
 */
export function bookingRequestFormDraftUrl(input: { occasion: string; step?: 'message' | 'auth' }): string {
    const dateTime = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString();
    const params = new URLSearchParams({
        occasion: input.occasion,
        adults: '2',
        dateTime,
        priceClass: 'MEDIUM',
        message: 'E2E booking request message',
        location: berlinAddress.displayText,
        lat: String(52.53),
        lng: String(13.41),
        addressLine1: berlinAddress.addressLine1,
        city: berlinAddress.city,
        postCode: berlinAddress.postCode,
        state: berlinAddress.state,
        country: berlinAddress.country,
        step: input.step ?? 'message',
    });
    return `/en/booking-request/form?${params.toString()}`;
}
