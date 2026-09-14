import { languageTagFromLocale } from './locale';
import type { Locale } from './locale';

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

type DateStyle = 'short' | 'medium' | 'long' | 'full';
type TimeStyle = 'short' | 'medium';

export type FormatDateOptions = {
    locale: Locale;
    dateStyle?: DateStyle;
    weekday?: boolean;
    timeZone?: string;
    nullAs?: string;
};

export type FormatTimeOptions = {
    locale: Locale;
    timeStyle?: TimeStyle;
    timeZone?: string;
    nullAs?: string;
};

export type FormatDateTimeOptions = {
    locale: Locale;
    dateStyle?: DateStyle;
    timeStyle?: TimeStyle;
    weekday?: boolean;
    timeZone?: string;
    nullAs?: string;
};

export type FormatDateRangeOptions = {
    locale: Locale;
    openEnded?: boolean;
    dateStyle?: DateStyle;
    timeZone?: string;
    nullAs?: string;
};

export type FormatMonthYearOptions = {
    locale: Locale;
    month?: 'short' | 'long';
    timeZone?: string;
};

function parseDisplayDate(value: string | Date): Date | null {
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }

    if (ISO_DATE_ONLY.test(value)) {
        const [y, m, d] = value.split('-').map(Number);
        if (y == null || m == null || d == null) return null;
        const date = new Date(y, m - 1, d);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function weekdayMonth(dateStyle: DateStyle): 'numeric' | 'short' | 'long' {
    if (dateStyle === 'short') return 'numeric';
    if (dateStyle === 'long' || dateStyle === 'full') return 'long';
    return 'short';
}

export function formatDate(value: string | Date | null | undefined, options: FormatDateOptions): string {
    const { locale, dateStyle = 'medium', weekday = false, timeZone, nullAs = '—' } = options;
    if (value == null || value === '') return nullAs;

    const date = parseDisplayDate(value);
    if (!date) return typeof value === 'string' ? value : nullAs;

    // Intl forbids mixing `dateStyle` with individual field options like `weekday`.
    if (weekday) {
        return new Intl.DateTimeFormat(languageTagFromLocale(locale), {
            timeZone,
            weekday: 'long',
            year: 'numeric',
            month: weekdayMonth(dateStyle),
            day: 'numeric',
        }).format(date);
    }

    return new Intl.DateTimeFormat(languageTagFromLocale(locale), { dateStyle, timeZone }).format(date);
}

export function formatTime(value: string | Date | null | undefined, options: FormatTimeOptions): string {
    const { locale, timeStyle = 'short', timeZone, nullAs = '—' } = options;
    if (value == null || value === '') return nullAs;

    const date = parseDisplayDate(value);
    if (!date) return typeof value === 'string' ? value : nullAs;

    return new Intl.DateTimeFormat(languageTagFromLocale(locale), { timeStyle, timeZone }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined, options: FormatDateTimeOptions): string {
    const { locale, dateStyle = 'medium', timeStyle = 'short', weekday = false, timeZone, nullAs = '—' } = options;
    if (value == null || value === '') return nullAs;

    const date = parseDisplayDate(value);
    if (!date) return typeof value === 'string' ? value : nullAs;

    // Intl forbids mixing `dateStyle` with individual field options like `weekday`.
    if (weekday) {
        return new Intl.DateTimeFormat(languageTagFromLocale(locale), {
            timeZone,
            weekday: dateStyle === 'full' ? 'long' : 'short',
            year: 'numeric',
            month: weekdayMonth(dateStyle),
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            ...(timeStyle === 'medium' ? { second: '2-digit' as const } : {}),
        }).format(date);
    }

    return new Intl.DateTimeFormat(languageTagFromLocale(locale), { dateStyle, timeStyle, timeZone }).format(date);
}

export function formatDateRange(
    startsOn: string | Date | null | undefined,
    endsOn: string | Date | null | undefined,
    options: FormatDateRangeOptions,
): string {
    const { locale, openEnded = false, dateStyle = 'medium', timeZone, nullAs = '—' } = options;
    const dateOpts: FormatDateOptions = { locale, dateStyle, timeZone, nullAs };

    if (startsOn == null && endsOn == null) return nullAs;
    if (startsOn != null && endsOn != null) {
        return `${formatDate(startsOn, dateOpts)} – ${formatDate(endsOn, dateOpts)}`;
    }
    if (!openEnded) {
        return formatDate(startsOn ?? endsOn, dateOpts);
    }
    if (startsOn != null) {
        return { de: `ab ${formatDate(startsOn, dateOpts)}`, en: `from ${formatDate(startsOn, dateOpts)}` }[locale];
    }
    return { de: `bis ${formatDate(endsOn, dateOpts)}`, en: `until ${formatDate(endsOn, dateOpts)}` }[locale];
}

export function formatMonthYear(value: string | Date, options: FormatMonthYearOptions): string {
    const { locale, month = 'short', timeZone } = options;
    const date = parseDisplayDate(value);
    if (!date) return typeof value === 'string' ? value : '';

    return new Intl.DateTimeFormat(languageTagFromLocale(locale), {
        month,
        year: 'numeric',
        timeZone,
    }).format(date);
}
