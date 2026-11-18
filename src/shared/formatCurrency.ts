import { t } from '../i18n/t';
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

    // Sub-euro amounts read clearer as "35 Cent" / "35 cents" than "0,35 €".
    const absoluteCents = Math.abs(cents);
    if (absoluteCents > 0 && absoluteCents < 100) {
        const label = t(locale, 'common', 'currency.cents', { count: absoluteCents });
        return cents < 0 ? `-${label}` : label;
    }

    return new Intl.NumberFormat(languageTagFromLocale(locale), {
        style: 'currency',
        currency,
        minimumFractionDigits: maximumFractionDigits,
        maximumFractionDigits,
    }).format(cents / 100);
}
