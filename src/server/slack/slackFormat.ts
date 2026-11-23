import { formatCurrency } from '../../shared/formatCurrency';
import { formatDateTime } from '../../shared/formatDate';
import { formatParticipants } from '../../shared/formatParticipants';
import type { BookingRequestExactEventAddress, BookingRequestPriceClassType } from '../domain/bookingRequest';
import type { BookingRequestOfferTestimonialReminderKind } from '../email/components/bookingRequestOfferTestimonialReminderEmailShared';

const PRICE_CLASS_LABEL: Record<BookingRequestPriceClassType, string> = {
    LOW: 'Casual Dining',
    MEDIUM: 'Signature Menü',
    HIGH: 'Prestige Experience',
};

const SLACK_TIME_ZONE = 'Europe/Berlin';

const EMPTY = 'nicht gesetzt';

export function slackFormatDateTime(value: Date): string {
    return formatDateTime(value, {
        locale: 'de',
        weekday: true,
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: SLACK_TIME_ZONE,
    });
}

export function slackFormatCents(cents: number): string {
    return formatCurrency(cents, { locale: 'de' });
}

export function slackFormatPriceClass(priceClassType: BookingRequestPriceClassType | null | undefined): string {
    if (!priceClassType) {
        return EMPTY;
    }
    return PRICE_CLASS_LABEL[priceClassType];
}

export function slackFormatCity(address: BookingRequestExactEventAddress): string {
    return address.city || address.displayText || EMPTY;
}

export function slackFormatParticipants(adultCount: number, discountedCount: number): string {
    return formatParticipants({ adultCount, discountedCount }, { locale: 'de' });
}

const TESTIMONIAL_KIND_LABEL: Record<BookingRequestOfferTestimonialReminderKind, string> = {
    MEMORY_NUDGE: 'Memory-Nudge',
    REMINDER_MORNING: 'Morgen-Erinnerung',
    REMINDER_EVENING: 'Abend-Erinnerung',
};

export function slackFormatTestimonialKind(kind: string): string {
    return TESTIMONIAL_KIND_LABEL[kind as BookingRequestOfferTestimonialReminderKind] ?? kind;
}

const PAYMENT_FAILED_EVENT_LABELS: Record<string, string> = {
    'setup_intent.setup_failed': 'Karteneinrichtung fehlgeschlagen. Der Kunde kann den Checkout erneut versuchen.',
    'setup_intent.canceled': 'Karteneinrichtung abgebrochen. Der Kunde kann den Checkout erneut versuchen.',
    'payment_intent.payment_failed': 'Kartenzahlung fehlgeschlagen. Der Kunde kann den Checkout erneut versuchen.',
    'payment_intent.canceled': 'Zahlung abgebrochen. Der Kunde kann den Checkout erneut versuchen.',
};

const PAYMENT_FAILED_CODE_LABELS: Record<string, string> = {
    payment_intent_authentication_failure: '3-D Secure fehlgeschlagen.',
    setup_intent_authentication_failure: '3-D Secure fehlgeschlagen.',
    authentication_required: 'Zusätzliche Authentifizierung erforderlich.',
};

/**
 * Map Stripe event types / error codes to ops German. Unknown technical detail
 * is replaced with a generic line (raw detail stays in server logs).
 */
export function slackPaymentFailedBody(detail?: string): string {
    if (!detail?.trim()) {
        return 'Zahlung fehlgeschlagen. Details stehen in den Server-Logs.';
    }
    const trimmed = detail.trim();
    const [eventType, ...rest] = trimmed.split(/\s+/);
    const eventLabel = eventType ? PAYMENT_FAILED_EVENT_LABELS[eventType] : undefined;
    const extraRaw = rest.join(' ');
    const extraLabel = extraRaw.length > 0 ? PAYMENT_FAILED_CODE_LABELS[extraRaw] : undefined;
    if (eventLabel && extraLabel) {
        return `${eventLabel} ${extraLabel}`;
    }
    if (eventLabel) {
        return eventLabel;
    }
    if (PAYMENT_FAILED_CODE_LABELS[trimmed]) {
        return PAYMENT_FAILED_CODE_LABELS[trimmed];
    }
    return 'Zahlung fehlgeschlagen. Details stehen in den Server-Logs.';
}

export const SLACK_PAYMENT_MISMATCH_BODY = 'Zahlung und gespeichertes Angebot stimmen nicht überein. Details stehen in den Server-Logs.';
