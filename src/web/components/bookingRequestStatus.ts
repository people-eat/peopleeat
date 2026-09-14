import type { Locale } from '../../shared/locale';
import type { GqlCBookingRequestStatus } from '../graphql/generated';

export type BookingRequestStatusDisplayFor = 'admin' | 'customer';

/** Predecessor palette — booking lifecycle pills only. See `docs/styles/status-messaging.md`. */
export function bookingRequestStatusClassName(status: GqlCBookingRequestStatus): string {
    switch (status) {
        case 'WAITING_FOR_OFFERS':
            return 'bg-yellow-100 text-yellow-700';
        case 'OFFERS_WAITING_FOR_REVIEW':
            return 'bg-blue-100 text-blue-700';
        case 'DEPOSIT_PAYMENT_PENDING':
        case 'COMPLETED':
            return 'bg-purple-100 text-purple-700';
        case 'PAYMENT_PULL_PENDING':
        case 'EVENT_PENDING':
            return 'bg-green-100 text-green-700';
        case 'EXPIRED':
        case 'CANCELED':
            return 'bg-red-100 text-red-700';
        default:
            return 'bg-gray-100 text-gray-700';
    }
}

export function bookingRequestStatusLabel(
    status: GqlCBookingRequestStatus,
    locale: Locale,
    displayFor: BookingRequestStatusDisplayFor = 'admin',
): string {
    switch (status) {
        case 'WAITING_FOR_OFFERS':
            return { de: 'Warten auf Angebote', en: 'Waiting for offers' }[locale];
        case 'OFFERS_WAITING_FOR_REVIEW':
            return (
                {
                    admin: { de: 'Angebote erhalten', en: 'Offers available' },
                    customer: { de: 'Du hast Angebote bekommen', en: 'Offers available' },
                } as const
            )[displayFor][locale];
        case 'DEPOSIT_PAYMENT_PENDING':
            return { de: 'Zahlungsmittel hinterlegen', en: 'Provide payment data' }[locale];
        case 'PAYMENT_PULL_PENDING':
            return (
                {
                    admin: { de: 'Zahlungseinzug ausstehend', en: 'Payment outstanding' },
                    customer: { de: 'Bestätigt', en: 'Confirmed' },
                } as const
            )[displayFor][locale];
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

export function adminBookingRequestStatusLabel(status: GqlCBookingRequestStatus, locale: Locale): string {
    return bookingRequestStatusLabel(status, locale, 'admin');
}
