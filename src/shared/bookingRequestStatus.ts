import type { BookingLifecycleHue } from './bookingLifecycleHue';
import type { Locale } from './locale';

/** Derived request lifecycle — not stored on `BookingRequests`. */
export type BookingRequestStatus =
    | 'WAITING_FOR_OFFERS'
    | 'OFFERS_WAITING_FOR_REVIEW'
    | 'DEPOSIT_PAYMENT_PENDING'
    | 'PAYMENT_PULL_PENDING'
    | 'EVENT_PENDING'
    | 'COMPLETED'
    | 'EXPIRED'
    | 'CANCELED';

export type BookingRequestStatusAudience = 'admin' | 'customer';

export function bookingRequestStatusHue(status: BookingRequestStatus): BookingLifecycleHue {
    switch (status) {
        case 'WAITING_FOR_OFFERS':
            return 'yellow';
        case 'OFFERS_WAITING_FOR_REVIEW':
            return 'blue';
        case 'DEPOSIT_PAYMENT_PENDING':
        case 'COMPLETED':
            return 'purple';
        case 'PAYMENT_PULL_PENDING':
        case 'EVENT_PENDING':
            return 'green';
        case 'EXPIRED':
        case 'CANCELED':
            return 'red';
        default:
            return 'gray';
    }
}

export function bookingRequestStatusLabel(status: BookingRequestStatus, locale: Locale, audience: BookingRequestStatusAudience): string {
    switch (status) {
        case 'WAITING_FOR_OFFERS':
            return { de: 'Warten auf Angebote', en: 'Waiting for offers' }[locale];
        case 'OFFERS_WAITING_FOR_REVIEW':
            return (
                {
                    admin: { de: 'Angebote erhalten', en: 'Offers available' },
                    customer: { de: 'Du hast Angebote bekommen', en: 'Offers available' },
                } as const
            )[audience][locale];
        case 'DEPOSIT_PAYMENT_PENDING':
            return { de: 'Zahlungsmittel hinterlegen', en: 'Provide payment data' }[locale];
        case 'PAYMENT_PULL_PENDING':
            return (
                {
                    admin: { de: 'Zahlungseinzug ausstehend', en: 'Payment outstanding' },
                    customer: { de: 'Bestätigt', en: 'Confirmed' },
                } as const
            )[audience][locale];
        case 'EVENT_PENDING':
            return { de: 'Veranstaltung ausstehend', en: 'Upcoming event' }[locale];
        case 'COMPLETED':
            return { de: 'Stattgefunden', en: 'Completed' }[locale];
        case 'EXPIRED':
            return { de: 'Abgelaufen', en: 'Expired' }[locale];
        case 'CANCELED':
            return { de: 'Storniert', en: 'Cancelled' }[locale];
        default:
            return status;
    }
}
