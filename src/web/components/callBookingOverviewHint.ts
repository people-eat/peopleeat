import {
    cookCallSlotBookingNextStepIsBefore,
    cookCallSlotBookingNextStepPick,
    cookCallSlotBookingWhenFormat,
} from '../../shared/cookCallSlotBookingStatus';
import type { CookCallSlotBookingNextStep } from '../../shared/cookCallSlotBookingStatus';
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

function confirmedCallHint(booking: CallBookingOverviewItem, locale: Locale, timeZone: string): CallBookingOverviewHint {
    const when = cookCallSlotBookingWhenFormat(booking, locale, timeZone);
    return {
        booking,
        label: { de: `Gesprächstermin bestätigt · ${when}`, en: `Discovery call confirmed · ${when}` }[locale],
        openCall: true,
    };
}

function participantCallHint(
    callBookings: readonly CallBookingOverviewItem[],
    role: 'customer' | 'cook',
    locale: Locale,
    timeZone: string,
): (CallBookingOverviewHint & { step: CookCallSlotBookingNextStep }) | null {
    const picked = cookCallSlotBookingNextStepPick(callBookings, role);
    if (!picked) return null;
    const { booking, step } = picked;
    if (step === 'CONFIRMED') return { ...confirmedCallHint(booking, locale, timeZone), step };

    const when = cookCallSlotBookingWhenFormat(booking, locale, timeZone);
    const label =
        step === 'RESPONSE_NEEDED'
            ? role === 'customer'
                ? { de: `Terminvorschlag wartet auf dich · ${when}`, en: `Call suggestion awaiting your response · ${when}` }[locale]
                : { de: `Terminanfrage wartet auf dich · ${when}`, en: `Call request awaiting your response · ${when}` }[locale]
            : role === 'customer'
              ? { de: `Terminanfrage ausstehend · ${when}`, en: `Call request pending · ${when}` }[locale]
              : { de: `Terminvorschlag ausstehend · ${when}`, en: `Call suggestion pending · ${when}` }[locale];
    return { booking, label, openCall: true, step };
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

    if (role !== 'admin') {
        const hint = participantCallHint(callBookings, role, locale, timeZone);
        return hint ? { booking: hint.booking, label: hint.label, openCall: hint.openCall } : null;
    }

    const pendingAwaitingCustomer = callBookings.find((booking) => booking.status === 'PENDING' && booking.initiator === 'COOK');
    if (pendingAwaitingCustomer) {
        const when = cookCallSlotBookingWhenFormat(pendingAwaitingCustomer, locale, timeZone);
        return {
            booking: pendingAwaitingCustomer,
            label: { de: `Terminvorschlag wartet auf Kunden · ${when}`, en: `Call suggestion awaiting customer · ${when}` }[locale],
            openCall: true,
        };
    }
    const pendingAwaitingCook = callBookings.find((booking) => booking.status === 'PENDING' && booking.initiator === 'CUSTOMER');
    if (pendingAwaitingCook) {
        const when = cookCallSlotBookingWhenFormat(pendingAwaitingCook, locale, timeZone);
        return {
            booking: pendingAwaitingCook,
            label: { de: `Terminanfrage wartet auf Koch · ${when}`, en: `Call request awaiting chef · ${when}` }[locale],
            openCall: true,
        };
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
    let bestStep: CookCallSlotBookingNextStep | null = null;

    for (const offer of offers) {
        const hint = participantCallHint(offer.callBookings ?? [], 'customer', locale, timeZone);
        if (!hint || !cookCallSlotBookingNextStepIsBefore(hint.step, bestStep)) continue;
        bestStep = hint.step;
        best = { booking: hint.booking, label: hint.label, openCall: hint.openCall, bookingRequestOfferId: offer.bookingRequestOfferId };
    }

    return best;
}
