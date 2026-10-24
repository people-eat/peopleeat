import { formatCurrency } from '../../../shared';
import type { Locale } from '../../utils/locale';

/** Formats a median latency in minutes for cook analytics UI. */
export function cookAnalyticsFormatDurationMinutes(minutes: number | null | undefined, locale: Locale): string {
    if (minutes == null || !Number.isFinite(minutes) || minutes < 0) {
        return { de: 'k. A.', en: 'n/a' }[locale];
    }
    if (minutes < 1) {
        return { de: 'unter 1 Min.', en: 'under 1 min' }[locale];
    }
    if (minutes < 60) {
        const rounded = Math.round(minutes);
        return { de: `${rounded} Min.`, en: `${rounded} min` }[locale];
    }
    const totalHours = minutes / 60;
    if (totalHours < 48) {
        const hours = Math.floor(totalHours);
        const mins = Math.round(minutes - hours * 60);
        if (mins === 0) {
            return { de: `${hours} Std.`, en: `${hours}h` }[locale];
        }
        return { de: `${hours} Std. ${mins} Min.`, en: `${hours}h ${mins}m` }[locale];
    }
    const days = Math.round(totalHours / 24);
    return { de: `${days} Tage`, en: `${days} days` }[locale];
}

export function cookAnalyticsFormatPercent(rate: number | null | undefined, locale: Locale): string {
    if (rate == null || !Number.isFinite(rate)) {
        return { de: 'k. A.', en: 'n/a' }[locale];
    }
    const percent = Math.round(rate * 100);
    return `${percent}\u00a0%`;
}

export function cookAnalyticsFormatAverageParticipants(value: number | null | undefined, locale: Locale): string {
    if (value == null || !Number.isFinite(value)) {
        return { de: 'k. A.', en: 'n/a' }[locale];
    }
    return new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-US', {
        maximumFractionDigits: 1,
        minimumFractionDigits: 0,
    }).format(value);
}

export function cookAnalyticsFormatMenuPrice(cents: number | null | undefined, locale: Locale): string {
    if (cents == null) {
        return { de: 'k. A.', en: 'n/a' }[locale];
    }
    return formatCurrency(cents, { locale, maximumFractionDigits: 0 });
}
