import type { GqlCBookingRequestOfferPaymentStatus } from '../graphql/generated';
import { bookingPaymentPullIsPast } from '../utils/bookingPaymentPullIsPast';
import type { Locale } from '../utils/locale';
import type { StatusTone } from './base/status';

/** Short admin label for offer `paymentStatus` (not customer/cook “you”-centric). */
export function adminBookingRequestOfferPaymentStatusLabel(status: GqlCBookingRequestOfferPaymentStatus, locale: Locale): string {
    return {
        EMPTY: { de: 'Noch nicht vorbereitet', en: 'Not prepared yet' },
        SETUP: { de: 'Karte hinterlegt', en: 'Card on file' },
        PAYED: { de: 'Bezahlt', en: 'Paid' },
        TRANSFERRED: { de: 'An Koch ausgezahlt', en: 'Paid out to cook' },
        FAILED: { de: 'Fehlgeschlagen', en: 'Failed' },
        PAYED_OUT_OF_SYSTEM: { de: 'Außerhalb von Stripe', en: 'Paid out of system' },
    }[status][locale];
}

/** One-sentence ops explanation of what the status means next. */
export function adminBookingRequestOfferPaymentStatusDescription(
    status: GqlCBookingRequestOfferPaymentStatus,
    locale: Locale,
    options?: { plannedPaymentPullDateTime?: Date | string | null },
): string {
    if (status === 'SETUP' && bookingPaymentPullIsPast(options?.plannedPaymentPullDateTime)) {
        return {
            de: 'Kartendaten sind gespeichert. Der geplante Einzugstermin ist vorbei; der Betrag wird in Kürze automatisch abgebucht.',
            en: 'Card details are saved. The planned pull date is past; the amount will be charged automatically shortly.',
        }[locale];
    }

    return {
        EMPTY: {
            de: 'Noch keine Stripe-Zahlung vorbereitet. Checkout steht aus, oder eine Vorbereitung wurde zurückgesetzt.',
            en: 'No Stripe payment prepared yet. Checkout is still pending, or a prior preparation was reset.',
        },
        SETUP: {
            de: 'Kartendaten sind gespeichert. Der Betrag wird zum geplanten Einzugstermin automatisch abgebucht.',
            en: 'Card details are saved. The amount will be charged automatically on the planned pull date.',
        },
        PAYED: {
            de: 'Kunde hat bezahlt. Der Koch-Anteil liegt auf dem Stripe-Connect-Guthaben und wartet auf die Bank-Auszahlung.',
            en: 'Customer paid. The cook share sits on the Stripe Connect balance and still needs a bank payout.',
        },
        TRANSFERRED: {
            de: 'Stripe hat den Koch-Anteil aufs Bankkonto ausgezahlt. Preisänderungen und Übergaben sind blockiert.',
            en: 'Stripe paid the cook share to their bank. Price changes and handovers are blocked.',
        },
        FAILED: {
            de: 'Zahlung ist fehlgeschlagen oder wurde abgebrochen. Checkout oder erneute Vorbereitung ist nötig.',
            en: 'Payment failed or was canceled. Checkout or re-preparation is needed.',
        },
        PAYED_OUT_OF_SYSTEM: {
            de: 'Als außerhalb von Stripe ausgezahlt markiert (z. B. Überweisung). Optional prüfen, ob Stripe doch schon ausgezahlt hat.',
            en: 'Marked as paid outside Stripe (for example wire). Optionally check whether Stripe already paid out.',
        },
    }[status][locale];
}

/** Ops note under planned pull when that instant is already past and money is not collected yet. */
export function adminBookingRequestOfferPlannedPullPastNote(
    paymentStatus: GqlCBookingRequestOfferPaymentStatus,
    locale: Locale,
): string | null {
    if (paymentStatus === 'EMPTY') {
        return {
            de: 'Bereits in der Vergangenheit. Wird direkt nach Eingabe der Zahlungsdaten eingezogen.',
            en: 'Already in the past. Will be pulled right after the customer enters payment data.',
        }[locale];
    }
    if (paymentStatus === 'SETUP') {
        return {
            de: 'Bereits in der Vergangenheit. Der automatische Einzug sollte in Kürze laufen.',
            en: 'Already in the past. The automatic pull should run shortly.',
        }[locale];
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
