import { languageTagFromLocale } from './locale';
import type { Locale } from './locale';

type FormatCurrencyNullAs = 'zero' | 'emDash' | 'empty';

export type FormatCurrencyOptions = {
    locale: Locale;
    currency?: string;
    /** Override fraction digits (default 2). Pass `0` for whole-euro admin summaries. */
    maximumFractionDigits?: number;
    nullAs?: FormatCurrencyNullAs;
};

export function formatCurrency(cents: number | null | undefined, options: FormatCurrencyOptions): string {
    const { locale, currency = 'EUR', maximumFractionDigits = 2, nullAs = 'zero' } = options;

    if (cents == null) {
        if (nullAs === 'emDash') return '—';
        if (nullAs === 'empty') return '';
        cents = 0;
    }

    return new Intl.NumberFormat(languageTagFromLocale(locale), {
        style: 'currency',
        currency,
        minimumFractionDigits: maximumFractionDigits,
        maximumFractionDigits,
    }).format(cents / 100);
}
