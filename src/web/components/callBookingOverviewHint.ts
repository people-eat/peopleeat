import { formatDate, formatTime } from '../../shared';
import type { Locale } from '../utils/locale';

export type CallBookingOverviewItem = {
    cookCallSlotBookingId?: string;
    startAt: string;
    endAt: string;
    status: 'PENDING' | 'CONFIRMED' | 'CANCELED' | 'COMPLETED' | 'DECLINED' | string;
    initiator: 'CUSTOMER' | 'COOK' | string;
};

export type CallBookingOverviewRole = 'customer' | 'cook' | 'admin';

export type CallBookingOverviewHint = {
    booking: CallBookingOverviewItem;
    label: string;
    /** Open the offer Call tab for this booking. */
    openCall: boolean;
};

function formatCallWhen(booking: CallBookingOverviewItem, locale: Locale, timeZone: string): string {
    const start = new Date(booking.startAt);
    return `${formatDate(start, { locale, timeZone, weekday: true })} · ${formatTime(booking.startAt, { locale, timeZone })}–${formatTime(booking.endAt, { locale, timeZone })}${locale === 'de' ? ' Uhr' : ''}`;
}

function confirmedCallHint(booking: CallBookingOverviewItem, locale: Locale, timeZone: string): CallBookingOverviewHint {
    return {
        booking,
        label: {
            de: `Gesprächstermin bestätigt · ${formatCallWhen(booking, locale, timeZone)}`,
            en: `Discovery call confirmed · ${formatCallWhen(booking, locale, timeZone)}`,
        }[locale],
        openCall: true,
    };
}

/**
 * Picks the actionable call on an offer card: incoming PENDING, else outgoing PENDING, else CONFIRMED.
 * Admin uses neutral copy (who must act) instead of “you”-centric wording.
 */
export function callBookingOverviewHint(
    callBookings: readonly CallBookingOverviewItem[] | undefined,
    role: CallBookingOverviewRole,
    locale: Locale,
    timeZone: string,
): CallBookingOverviewHint | null {
    if (!callBookings || callBookings.length === 0) return null;

    if (role === 'admin') {
        const pendingAwaitingCustomer = callBookings.find((booking) => booking.status === 'PENDING' && booking.initiator === 'COOK');
        if (pendingAwaitingCustomer) {
            return {
                booking: pendingAwaitingCustomer,
                label: {
                    de: `Terminvorschlag wartet auf Kunden · ${formatCallWhen(pendingAwaitingCustomer, locale, timeZone)}`,
                    en: `Call suggestion awaiting customer · ${formatCallWhen(pendingAwaitingCustomer, locale, timeZone)}`,
                }[locale],
                openCall: true,
            };
        }
        const pendingAwaitingCook = callBookings.find((booking) => booking.status === 'PENDING' && booking.initiator === 'CUSTOMER');
        if (pendingAwaitingCook) {
            return {
                booking: pendingAwaitingCook,
                label: {
                    de: `Terminanfrage wartet auf Koch · ${formatCallWhen(pendingAwaitingCook, locale, timeZone)}`,
                    en: `Call request awaiting chef · ${formatCallWhen(pendingAwaitingCook, locale, timeZone)}`,
                }[locale],
                openCall: true,
            };
        }
        const confirmed = callBookings.find((booking) => booking.status === 'CONFIRMED');
        return confirmed ? confirmedCallHint(confirmed, locale, timeZone) : null;
    }

    const incomingInitiator = role === 'customer' ? 'COOK' : 'CUSTOMER';
    const outgoingInitiator = role === 'customer' ? 'CUSTOMER' : 'COOK';

    const pendingIncoming = callBookings.find((booking) => booking.status === 'PENDING' && booking.initiator === incomingInitiator);
    if (pendingIncoming) {
        const label =
            role === 'customer'
                ? {
                      de: `Terminvorschlag wartet auf dich · ${formatCallWhen(pendingIncoming, locale, timeZone)}`,
                      en: `Call suggestion awaiting your response · ${formatCallWhen(pendingIncoming, locale, timeZone)}`,
                  }[locale]
                : {
                      de: `Terminanfrage wartet auf dich · ${formatCallWhen(pendingIncoming, locale, timeZone)}`,
                      en: `Call request awaiting your response · ${formatCallWhen(pendingIncoming, locale, timeZone)}`,
                  }[locale];
        return { booking: pendingIncoming, label, openCall: true };
    }

    const pendingOutgoing = callBookings.find((booking) => booking.status === 'PENDING' && booking.initiator === outgoingInitiator);
    if (pendingOutgoing) {
        const label =
            role === 'customer'
                ? {
                      de: `Terminanfrage ausstehend · ${formatCallWhen(pendingOutgoing, locale, timeZone)}`,
                      en: `Call request pending · ${formatCallWhen(pendingOutgoing, locale, timeZone)}`,
                  }[locale]
                : {
                      de: `Terminvorschlag ausstehend · ${formatCallWhen(pendingOutgoing, locale, timeZone)}`,
                      en: `Call suggestion pending · ${formatCallWhen(pendingOutgoing, locale, timeZone)}`,
                  }[locale];
        return { booking: pendingOutgoing, label, openCall: true };
    }

    const confirmed = callBookings.find((booking) => booking.status === 'CONFIRMED');
    return confirmed ? confirmedCallHint(confirmed, locale, timeZone) : null;
}

/**
 * Rolled-up hint across offers on a customer booking-request card.
 * Prefers an incoming PENDING offer, else any PENDING, else any CONFIRMED.
 */
export function callBookingOverviewHintAcrossOffers(
    offers: readonly { bookingRequestOfferId: string; callBookings?: readonly CallBookingOverviewItem[] }[],
    locale: Locale,
    timeZone: string,
): (CallBookingOverviewHint & { bookingRequestOfferId: string }) | null {
    let best: (CallBookingOverviewHint & { bookingRequestOfferId: string }) | null = null;
    let bestRank = 99;

    for (const offer of offers) {
        const hint = callBookingOverviewHint(offer.callBookings, 'customer', locale, timeZone);
        if (!hint) continue;
        const rank = hint.booking.status === 'PENDING' && hint.booking.initiator === 'COOK' ? 0 : hint.booking.status === 'PENDING' ? 1 : 2;
        if (rank < bestRank) {
            bestRank = rank;
            best = { ...hint, bookingRequestOfferId: offer.bookingRequestOfferId };
        }
    }

    return best;
}
