import type { BookingLifecycleHue } from './bookingLifecycleHue';
import type { Locale } from './locale';

/** Derived offer lifecycle — not stored on `BookingRequestOffers`. */
export type BookingRequestOfferStatus =
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
    | 'CANCELED';

/** `admin` is neutral ops wording; `customer` / `cook` address the viewer directly. */
export type BookingRequestOfferStatusAudience = 'customer' | 'cook' | 'admin';

export function bookingRequestOfferStatusHue(status: BookingRequestOfferStatus): BookingLifecycleHue {
    switch (status) {
        case 'USER_NEEDS_TO_ACCEPT':
            return 'blue';
        case 'COOK_NEEDS_TO_ACCEPT':
        case 'USER_REQUESTED_MENU_CHANGES':
            return 'yellow';
        case 'USER_NEEDS_DEPOSIT_PAYMENT':
        case 'PAYMENT_PULL_PENDING':
        case 'EVENT_PENDING':
            return 'green';
        case 'COMPLETED':
            return 'purple';
        case 'USER_DECLINED':
        case 'COOK_DECLINED':
        case 'USER_CHOOSE_DIFFERENT_OFFER':
        case 'EXPIRED':
        case 'CANCELED':
            return 'red';
        default:
            return 'gray';
    }
}

export function bookingRequestOfferStatusLabel(
    status: BookingRequestOfferStatus,
    locale: Locale,
    audience: BookingRequestOfferStatusAudience,
): string {
    switch (status) {
        case 'USER_NEEDS_TO_ACCEPT':
            return (
                {
                    customer: { de: 'Überprüfe das Angebot', en: 'Check offer' },
                    cook: { de: 'Kunde muss akzeptieren', en: 'Customer needs to accept' },
                    admin: { de: 'Kunde muss akzeptieren', en: 'Customer needs to accept' },
                } as const
            )[audience][locale];
        case 'COOK_NEEDS_TO_ACCEPT':
            return (
                {
                    customer: { de: 'Koch muss Änderungen akzeptieren', en: 'Chef needs to confirm changes' },
                    cook: { de: 'Änderungen bestätigen', en: 'Confirm changes' },
                    admin: { de: 'Koch muss Änderungen bestätigen', en: 'Chef needs to confirm changes' },
                } as const
            )[audience][locale];
        case 'USER_REQUESTED_MENU_CHANGES':
            return { de: 'Menüänderungen angefragt', en: 'Menu changes requested' }[locale];
        case 'USER_DECLINED':
            return (
                {
                    customer: { de: 'Du hast abgelehnt', en: 'You rejected offer' },
                    cook: { de: 'Kunde hat Angebot abgelehnt', en: 'Customer rejected offer' },
                    admin: { de: 'Kunde hat Angebot abgelehnt', en: 'Customer rejected offer' },
                } as const
            )[audience][locale];
        case 'COOK_DECLINED':
            return (
                {
                    customer: { de: 'Koch hat Angebot zurückgezogen', en: 'Chef has withdrawn offer' },
                    cook: { de: 'Du hast Angebot zurückgezogen', en: 'You have withdrawn offer' },
                    admin: { de: 'Koch hat Angebot zurückgezogen', en: 'Chef has withdrawn offer' },
                } as const
            )[audience][locale];
        case 'USER_CHOOSE_DIFFERENT_OFFER':
            return { de: 'Alternativangebot gewählt', en: 'Alternative offer chosen' }[locale];
        case 'USER_NEEDS_DEPOSIT_PAYMENT':
            return (
                {
                    customer: { de: 'Zahlungsmittel hinterlegen', en: 'Provide payment data' },
                    cook: { de: 'Bestätigt', en: 'Confirmed' },
                    admin: { de: 'Kunde muss Zahlungsdaten hinterlegen', en: 'Customer needs to provide payment data' },
                } as const
            )[audience][locale];
        case 'PAYMENT_PULL_PENDING':
            return (
                {
                    customer: { de: 'Bestätigt', en: 'Confirmed' },
                    cook: { de: 'Bestätigt', en: 'Confirmed' },
                    admin: { de: 'Zahlungseinzug ausstehend', en: 'Payment outstanding' },
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
