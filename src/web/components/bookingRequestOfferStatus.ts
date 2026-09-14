import type { Locale } from '../utils/locale';

export type BookingRequestOfferStatusKey =
    | 'USER_NEEDS_TO_ACCEPT'
    | 'COOK_NEEDS_TO_ACCEPT'
    | 'USER_REQUESTED_MENU_CHANGES'
    | 'USER_DECLINED'
    | 'COOK_DECLINED'
    | 'USER_CHOOSE_DIFFERENT_OFFER'
    | 'USER_NEEDS_DEPOSIT_PAYMENT'
    | 'PAYMENT_PULL_PENDING'
    | 'EVENT_PENDING'
    | 'COMPLETED'
    | 'EXPIRED'
    | 'CANCELED'
    | string;

export type BookingRequestOfferStatusDisplayFor = 'customer' | 'cook';

/** Predecessor palette — booking lifecycle pills only. See `docs/styles/status-messaging.md`. */
export function bookingRequestOfferStatusClassName(status: BookingRequestOfferStatusKey): string {
    switch (status) {
        case 'USER_NEEDS_TO_ACCEPT':
            return 'bg-blue-100 text-blue-700';
        case 'COOK_NEEDS_TO_ACCEPT':
        case 'USER_REQUESTED_MENU_CHANGES':
            return 'bg-yellow-100 text-yellow-700';
        case 'USER_NEEDS_DEPOSIT_PAYMENT':
        case 'PAYMENT_PULL_PENDING':
        case 'EVENT_PENDING':
            return 'bg-green-100 text-green-700';
        case 'COMPLETED':
            return 'bg-purple-100 text-purple-700';
        case 'USER_DECLINED':
        case 'COOK_DECLINED':
        case 'USER_CHOOSE_DIFFERENT_OFFER':
        case 'EXPIRED':
        case 'CANCELED':
            return 'bg-red-100 text-red-700';
        default:
            return 'bg-gray-100 text-gray-700';
    }
}

export function bookingRequestOfferStatusLabel(
    status: BookingRequestOfferStatusKey,
    locale: Locale,
    displayFor: BookingRequestOfferStatusDisplayFor = 'customer',
): string {
    switch (status) {
        case 'USER_NEEDS_TO_ACCEPT':
            return (
                {
                    customer: { de: 'Überprüfe das Angebot', en: 'Check offer' },
                    cook: { de: 'Kunde muss akzeptieren', en: 'Customer needs to accept' },
                } as const
            )[displayFor][locale];
        case 'COOK_NEEDS_TO_ACCEPT':
            return (
                {
                    customer: { de: 'Koch muss Änderungen akzeptieren', en: 'Chef needs to confirm changes' },
                    cook: { de: 'Änderungen bestätigen', en: 'Confirm changes' },
                } as const
            )[displayFor][locale];
        case 'USER_REQUESTED_MENU_CHANGES':
            return { de: 'Menüänderungen angefragt', en: 'Menu changes requested' }[locale];
        case 'USER_DECLINED':
            return (
                {
                    customer: { de: 'Du hast abgelehnt', en: 'You rejected offer' },
                    cook: { de: 'Kunde hat Angebot abgelehnt', en: 'Customer rejected offer' },
                } as const
            )[displayFor][locale];
        case 'COOK_DECLINED':
            return (
                {
                    customer: { de: 'Koch hat Angebot zurückgezogen', en: 'Chef has withdrawn offer' },
                    cook: { de: 'Du hast Angebot zurückgezogen', en: 'You have withdrawn offer' },
                } as const
            )[displayFor][locale];
        case 'USER_CHOOSE_DIFFERENT_OFFER':
            return { de: 'Alternativangebot gewählt', en: 'Alternative offer chosen' }[locale];
        case 'USER_NEEDS_DEPOSIT_PAYMENT':
            return (
                {
                    customer: { de: 'Zahlungsmittel hinterlegen', en: 'Provide payment data' },
                    cook: { de: 'Bestätigt', en: 'Confirmed' },
                } as const
            )[displayFor][locale];
        case 'PAYMENT_PULL_PENDING':
            return (
                {
                    customer: { de: 'Bestätigt', en: 'Confirmed' },
                    cook: { de: 'Bestätigt', en: 'Confirmed' },
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
