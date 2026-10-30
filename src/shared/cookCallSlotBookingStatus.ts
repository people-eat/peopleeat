import { formatDate, formatTime } from './formatDate';
import type { Locale } from './locale';
import type { StatusTone } from './statusTone';

export type CookCallSlotBookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELED' | 'COMPLETED' | 'DECLINED';

export type CookCallSlotBookingActor = 'CUSTOMER' | 'COOK';

export type CookCallSlotBookingAudience = 'customer' | 'cook' | 'admin';

type CookCallSlotBookingStatusInput = {
    status: CookCallSlotBookingStatus;
    initiator: CookCallSlotBookingActor;
};

function cookCallSlotBookingAwaitsViewer({ initiator }: CookCallSlotBookingStatusInput, audience: CookCallSlotBookingAudience): boolean {
    return (audience === 'customer' && initiator === 'COOK') || (audience === 'cook' && initiator === 'CUSTOMER');
}

export function cookCallSlotBookingStatusLabel(
    booking: CookCallSlotBookingStatusInput,
    audience: CookCallSlotBookingAudience,
    locale: Locale,
): string {
    switch (booking.status) {
        case 'CONFIRMED':
            return { de: 'Bestätigt', en: 'Confirmed' }[locale];
        case 'DECLINED':
            return { de: 'Abgelehnt', en: 'Declined' }[locale];
        case 'CANCELED':
            return { de: 'Abgesagt', en: 'Canceled' }[locale];
        case 'COMPLETED':
            return { de: 'Abgeschlossen', en: 'Completed' }[locale];
        case 'PENDING':
            if (cookCallSlotBookingAwaitsViewer(booking, audience)) {
                return { de: 'Wartet auf deine Reaktion', en: 'Awaiting your response' }[locale];
            }
            if (audience === 'customer') {
                return { de: 'Warte auf Bestätigung', en: 'Awaiting confirmation' }[locale];
            }
            return booking.initiator === 'COOK'
                ? { de: 'Wartet auf Kunden', en: 'Awaiting customer' }[locale]
                : { de: 'Wartet auf Koch', en: 'Awaiting chef' }[locale];
        default:
            return booking.status;
    }
}

/** What a participant should do about a call: answer it, wait for the other side, or attend it. */
export type CookCallSlotBookingNextStep = 'RESPONSE_NEEDED' | 'PENDING' | 'CONFIRMED';

const cookCallSlotBookingNextStepRank: Record<CookCallSlotBookingNextStep, number> = { RESPONSE_NEEDED: 0, PENDING: 1, CONFIRMED: 2 };

/** Most actionable call for a participant: incoming PENDING, else outgoing PENDING, else CONFIRMED. */
export function cookCallSlotBookingNextStepPick<T extends { status: string; initiator: string }>(
    bookings: readonly T[],
    audience: 'customer' | 'cook',
): { booking: T; step: CookCallSlotBookingNextStep } | null {
    const incomingInitiator: CookCallSlotBookingActor = audience === 'customer' ? 'COOK' : 'CUSTOMER';
    let best: { booking: T; step: CookCallSlotBookingNextStep } | null = null;
    for (const booking of bookings) {
        const step: CookCallSlotBookingNextStep | null =
            booking.status === 'PENDING'
                ? booking.initiator === incomingInitiator
                    ? 'RESPONSE_NEEDED'
                    : 'PENDING'
                : booking.status === 'CONFIRMED'
                  ? 'CONFIRMED'
                  : null;
        if (step != null && (best == null || cookCallSlotBookingNextStepRank[step] < cookCallSlotBookingNextStepRank[best.step])) {
            best = { booking, step };
        }
    }
    return best;
}

/** Whether `a` is more actionable than `b` (null ranks last). */
export function cookCallSlotBookingNextStepIsBefore(a: CookCallSlotBookingNextStep, b: CookCallSlotBookingNextStep | null): boolean {
    return b == null || cookCallSlotBookingNextStepRank[a] < cookCallSlotBookingNextStepRank[b];
}

/** `Mo., 1. Juni · 14:00–14:15 Uhr` / `Mon, Jun 1 · 2:00 PM–2:15 PM`. */
export function cookCallSlotBookingWhenFormat(
    { startAt, endAt }: { startAt: string | Date; endAt: string | Date },
    locale: Locale,
    timeZone: string,
): string {
    const day = formatDate(startAt, { locale, timeZone, weekday: true });
    const range = `${formatTime(startAt, { locale, timeZone })}–${formatTime(endAt, { locale, timeZone })}`;
    return `${day} · ${range}${locale === 'de' ? ' Uhr' : ''}`;
}

export function cookCallSlotBookingStatusTone(booking: CookCallSlotBookingStatusInput, audience: CookCallSlotBookingAudience): StatusTone {
    switch (booking.status) {
        case 'CONFIRMED':
        case 'COMPLETED':
            return 'success';
        case 'DECLINED':
        case 'CANCELED':
            return 'error';
        case 'PENDING':
            if (audience === 'admin') return 'warning';
            return cookCallSlotBookingAwaitsViewer(booking, audience) ? 'warning' : 'info';
        default:
            return 'info';
    }
}
