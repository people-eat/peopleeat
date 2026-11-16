import { i18nAudienceNamespace } from '../i18n/audienceNamespace';
import { t } from '../i18n/t';
import { formatDate, formatTime } from './formatDate';
import type { Locale } from './locale';
import type { StatusTone } from './statusTone';

export type CookCallSlotBookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELED' | 'COMPLETED' | 'DECLINED';

/** List order: confirmed, pending, declined, then canceled and completed. */
const cookCallSlotBookingListRank: Record<CookCallSlotBookingStatus, number> = {
    CONFIRMED: 0,
    PENDING: 1,
    DECLINED: 2,
    CANCELED: 3,
    COMPLETED: 4,
};

/** Confirmed first, then pending, then declined. Earlier start time wins inside a status. */
export function compareCookCallSlotBookings(
    left: { status: CookCallSlotBookingStatus; startAt: string | Date },
    right: { status: CookCallSlotBookingStatus; startAt: string | Date },
): number {
    const byStatus = cookCallSlotBookingListRank[left.status] - cookCallSlotBookingListRank[right.status];
    if (byStatus !== 0) return byStatus;
    return new Date(left.startAt).getTime() - new Date(right.startAt).getTime();
}

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
    const ns = i18nAudienceNamespace(audience);
    switch (booking.status) {
        case 'CONFIRMED':
            return t(locale, ns, 'callSlot.status.CONFIRMED');
        case 'DECLINED':
            return t(locale, ns, 'callSlot.status.DECLINED');
        case 'CANCELED':
            return t(locale, ns, 'callSlot.status.CANCELED');
        case 'COMPLETED':
            return t(locale, ns, 'callSlot.status.COMPLETED');
        case 'PENDING':
            if (cookCallSlotBookingAwaitsViewer(booking, audience)) {
                return t(locale, ns, 'callSlot.status.PENDING_VIEWER');
            }
            if (audience === 'customer') {
                return t(locale, ns, 'callSlot.status.PENDING_OTHER');
            }
            return booking.initiator === 'COOK'
                ? t(locale, ns, 'callSlot.status.PENDING_CUSTOMER')
                : t(locale, ns, 'callSlot.status.PENDING_COOK');
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
    return t(locale, 'common', 'bookingWhen.withTimeSuffix', { value: `${day} · ${range}` });
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
