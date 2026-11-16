import { t } from '../../i18n/t';
import type { GqlCBookingRequestOfferPaymentStatus } from '../graphql/generated';
import { bookingPaymentPullIsPast } from '../utils/bookingPaymentPullIsPast';
import type { Locale } from '../utils/locale';
import type { StatusTone } from './base/status';

/** Short admin label for offer `paymentStatus` (not customer/cook "you"-centric). */
export function adminBookingRequestOfferPaymentStatusLabel(status: GqlCBookingRequestOfferPaymentStatus, locale: Locale): string {
    return t(locale, 'admin', `offerPayment.status.${status}`);
}

/** One-sentence ops explanation of what the status means next. */
export function adminBookingRequestOfferPaymentStatusDescription(
    status: GqlCBookingRequestOfferPaymentStatus,
    locale: Locale,
    options?: { plannedPaymentPullDateTime?: Date | string | null },
): string {
    if (status === 'SETUP' && bookingPaymentPullIsPast(options?.plannedPaymentPullDateTime)) {
        return t(locale, 'admin', 'offerPayment.descriptions.SETUP_PAST');
    }
    return t(locale, 'admin', `offerPayment.descriptions.${status}`);
}

/** Ops note under planned pull when that instant is already past and money is not collected yet. */
export function adminBookingRequestOfferPlannedPullPastNote(
    paymentStatus: GqlCBookingRequestOfferPaymentStatus,
    locale: Locale,
): string | null {
    if (paymentStatus === 'EMPTY' || paymentStatus === 'SETUP') {
        return t(locale, 'admin', `offerPayment.plannedPullPast.${paymentStatus}`);
    }
    return null;
}

export function adminBookingRequestOfferPaymentStatusTone(status: GqlCBookingRequestOfferPaymentStatus): StatusTone {
    switch (status) {
        case 'EMPTY':
        case 'SETUP':
            return 'info';
        case 'PAYED':
        case 'TRANSFERRED':
            return 'success';
        case 'PAYED_OUT_OF_SYSTEM':
            return 'warning';
        case 'FAILED':
            return 'error';
    }
}
