import type { Locale } from '../utils/locale';

export type AdminBookingRequestOfferStatusKey =
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

/** Neutral admin wording (not customer/cook “you”-centric). Predecessor copy. */
export function adminBookingRequestOfferStatusLabel(status: AdminBookingRequestOfferStatusKey, locale: Locale): string {
    switch (status) {
        case 'USER_NEEDS_TO_ACCEPT':
            return { de: 'Kunde muss akzeptieren', en: 'Customer needs to accept' }[locale];
        case 'COOK_NEEDS_TO_ACCEPT':
            return { de: 'Koch muss Änderungen bestätigen', en: 'Chef needs to confirm changes' }[locale];
        case 'USER_REQUESTED_MENU_CHANGES':
            return { de: 'Menüänderungen angefragt', en: 'Menu changes requested' }[locale];
        case 'USER_DECLINED':
            return { de: 'Kunde hat Angebot abgelehnt', en: 'Customer rejected offer' }[locale];
        case 'COOK_DECLINED':
            return { de: 'Koch hat Angebot zurückgezogen', en: 'Chef has withdrawn offer' }[locale];
        case 'USER_CHOOSE_DIFFERENT_OFFER':
            return { de: 'Alternativangebot gewählt', en: 'Alternative offer chosen' }[locale];
        case 'USER_NEEDS_DEPOSIT_PAYMENT':
            return { de: 'Kunde muss Zahlungsdaten hinterlegen', en: 'Customer needs to provide payment data' }[locale];
        case 'PAYMENT_PULL_PENDING':
            return { de: 'Zahlungseinzug ausstehend', en: 'Payment outstanding' }[locale];
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
