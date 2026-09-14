import { formatCurrency } from '../../shared/formatCurrency';
import { formatDateTime } from '../../shared/formatDate';
import { formatParticipants } from '../../shared/formatParticipants';
import type { BookingRequestExactEventAddress, BookingRequestPriceClassType } from '../domain/bookingRequest';

const PRICE_CLASS_LABEL: Record<BookingRequestPriceClassType, string> = {
    LOW: 'Casual Dining',
    MEDIUM: 'Signature Menü',
    HIGH: 'Prestige Experience',
};

const SLACK_TIME_ZONE = 'Europe/Berlin';

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
        return '—';
    }
    return PRICE_CLASS_LABEL[priceClassType];
}

export function slackFormatCity(address: BookingRequestExactEventAddress): string {
    return address.city || address.displayText || '—';
}

export function slackFormatParticipants(adultCount: number, discountedCount: number): string {
    return formatParticipants({ adultCount, discountedCount }, { locale: 'de' });
}

export function slackShortId(id: string): string {
    return id.slice(0, 8);
}
