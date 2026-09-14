import { languageTagFromLocale } from './locale';
import type { Locale } from './locale';

/**
 * Resolves a Places `country` value (usually ISO 3166-1 alpha-2) to a localized
 * region name. Long-form names already stored are returned as-is.
 */
export function formatCountryName(country: string, options: { locale: Locale }): string {
    const trimmed = country.trim();
    if (trimmed.length === 0) return '';
    if (!/^[A-Za-z]{2}$/.test(trimmed)) return trimmed;

    const code = trimmed.toUpperCase();
    return new Intl.DisplayNames(languageTagFromLocale(options.locale), { type: 'region' }).of(code) ?? code;
}
