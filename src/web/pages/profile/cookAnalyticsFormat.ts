import { t } from '../../../i18n/t';
import { formatCurrency } from '../../../shared';
import type { Locale } from '../../utils/locale';

/** Formats a median latency in minutes for cook analytics UI. */
export function cookAnalyticsFormatDurationMinutes(minutes: number | null | undefined, locale: Locale): string {
    if (minutes == null || !Number.isFinite(minutes) || minutes < 0) {
        return t(locale, 'profileCook', 'format.na');
    }
    if (minutes < 1) {
        return t(locale, 'profileCook', 'format.underOneMinute');
    }
    if (minutes < 60) {
        const rounded = Math.round(minutes);
        return t(locale, 'profileCook', 'format.minutes', { minutes: rounded });
    }
    const totalHours = minutes / 60;
    if (totalHours < 48) {
        const hours = Math.floor(totalHours);
        const mins = Math.round(minutes - hours * 60);
        if (mins === 0) {
            return t(locale, 'profileCook', 'format.hours', { hours });
        }
        return t(locale, 'profileCook', 'format.hoursMinutes', { hours, minutes: mins });
    }
    const days = Math.round(totalHours / 24);
    return t(locale, 'profileCook', 'format.days', { days });
}

export function cookAnalyticsFormatPercent(rate: number | null | undefined, locale: Locale): string {
    if (rate == null || !Number.isFinite(rate)) {
        return t(locale, 'profileCook', 'format.na');
    }
    const percent = Math.round(rate * 100);
    return `${percent}\u00a0%`;
}

export function cookAnalyticsFormatAverageParticipants(value: number | null | undefined, locale: Locale): string {
    if (value == null || !Number.isFinite(value)) {
        return t(locale, 'profileCook', 'format.na');
    }
    return new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-US', {
        maximumFractionDigits: 1,
        minimumFractionDigits: 0,
    }).format(value);
}

export function cookAnalyticsFormatMenuPrice(cents: number | null | undefined, locale: Locale): string {
    if (cents == null) {
        return t(locale, 'profileCook', 'format.na');
    }
    return formatCurrency(cents, { locale, maximumFractionDigits: 0 });
}
