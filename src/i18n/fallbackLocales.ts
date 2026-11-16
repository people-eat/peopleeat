import { DEFAULT_LOCALE } from '../shared/locale';
import type { CatalogLocale } from '../shared/locale';

/** Fallback chain: `fr | it | ru | nl | en → de`. Missing keys render German, never a raw key. */
export function i18nFallbackLocales(locale: CatalogLocale): CatalogLocale[] {
    if (locale === DEFAULT_LOCALE) return [];
    return [DEFAULT_LOCALE];
}

export function i18nFallbackLng(locale: CatalogLocale): false | string {
    const fallbacks = i18nFallbackLocales(locale);
    if (fallbacks.length === 0) return false;
    return fallbacks[0]!;
}
