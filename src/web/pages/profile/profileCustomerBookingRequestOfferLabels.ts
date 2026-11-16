import { t } from '../../../i18n/t';
import type { Locale } from '../../../shared/locale';

export function profileCustomerBookingRequestOfferPageTitle(locale: Locale): string {
    return t(locale, 'profileCustomer', 'bookingRequestOffer.detail.title');
}
export function profileCustomerBookingRequestOfferPageDescription(locale: Locale): string {
    return t(locale, 'profileCustomer', 'bookingRequestOffer.detail.description');
}

export function profileCustomerBookingRequestOfferCheckoutPageTitle(locale: Locale): string {
    return t(locale, 'profileCustomer', 'bookingRequestOffer.checkout.title');
}
export function profileCustomerBookingRequestOfferCheckoutPageDescription(locale: Locale): string {
    return t(locale, 'profileCustomer', 'bookingRequestOffer.checkout.description');
}
