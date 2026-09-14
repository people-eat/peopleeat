import { formatDate, formatTime } from '../../../shared/formatDate';
import type { Locale } from '../../../shared/locale';

export function formatCallSlotDate(value: Date, locale: Locale, timeZone: string): string {
    return formatDate(value, {
        locale,
        weekday: true,
        dateStyle: 'long',
        timeZone,
    });
}

export function formatCallSlotTime(value: Date, locale: Locale, timeZone: string): string {
    return formatTime(value, {
        locale,
        timeStyle: 'short',
        timeZone,
    });
}

export function bookingRequestOfferCallSlotOfferUrls(webPageUrl: string, bookingRequestId: string, bookingRequestOfferId: string) {
    const base = webPageUrl.replace(/\/$/, '');
    return {
        customer: `${base}/profile/booking-requests/${bookingRequestId}/offers/${bookingRequestOfferId}?tab=call`,
        cook: `${base}/profile/booking-request-offers/${bookingRequestOfferId}?tab=call`,
    };
}
