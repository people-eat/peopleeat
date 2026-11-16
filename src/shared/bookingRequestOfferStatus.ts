import { i18nAudienceNamespace } from '../i18n/audienceNamespace';
import { t } from '../i18n/t';
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
    return t(locale, i18nAudienceNamespace(audience), `bookingRequestOffer.status.${status}`);
}
