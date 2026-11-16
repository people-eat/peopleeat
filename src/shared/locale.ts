export const CATALOG_LOCALES = ['de', 'en', 'fr', 'it'] as const;
export type CatalogLocale = (typeof CATALOG_LOCALES)[number];

/** Public URL / profile / GraphQL locale. Same set as catalog locales. */
export type Locale = CatalogLocale;

export const DEFAULT_LOCALE: Locale = 'de';

/** Unmigrated inline copy. New strings belong in `src/i18n` catalogs. */
export type InlineCopy<T = string> = { de: T; en: T };

const LANGUAGE_TAGS = {
    de: 'de-DE',
    en: 'en-US',
    fr: 'fr-FR',
    it: 'it-IT',
} as const satisfies Record<CatalogLocale, string>;

export function isLocale(value: string | undefined): value is Locale {
    return !!value && (CATALOG_LOCALES as readonly string[]).includes(value);
}

export function languageTagFromLocale(locale: CatalogLocale): (typeof LANGUAGE_TAGS)[CatalogLocale] {
    return LANGUAGE_TAGS[locale];
}

/** Read unmigrated `{ de, en }` copy. `fr` / `it` fall back to German. */
export function inlineCopy<T>(messages: InlineCopy<T>, locale: CatalogLocale): T {
    return locale === 'en' ? messages.en : messages.de;
}
