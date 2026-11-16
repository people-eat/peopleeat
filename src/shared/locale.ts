export const CATALOG_LOCALES = ['de', 'en', 'fr', 'it', 'ru'] as const;
export type CatalogLocale = (typeof CATALOG_LOCALES)[number];

/** Public URL / profile / GraphQL locale. Same set as catalog locales. */
export type Locale = CatalogLocale;

export const DEFAULT_LOCALE: Locale = 'de';

const LANGUAGE_TAGS = {
    de: 'de-DE',
    en: 'en-US',
    fr: 'fr-FR',
    it: 'it-IT',
    ru: 'ru-RU',
} as const satisfies Record<CatalogLocale, string>;

export function isLocale(value: string | undefined): value is Locale {
    return !!value && (CATALOG_LOCALES as readonly string[]).includes(value);
}

export function languageTagFromLocale(locale: CatalogLocale): (typeof LANGUAGE_TAGS)[CatalogLocale] {
    return LANGUAGE_TAGS[locale];
}

/** True when the first path segment is a non-default locale prefix (`en`, `fr`, …). */
function isLocalePrefixSegment(segment: string | undefined): segment is CatalogLocale {
    return isLocale(segment) && segment !== DEFAULT_LOCALE;
}

/**
 * Strip every leading non-default locale prefix (`/en/…`, doubled `/en/en/…`).
 * Default locale stays unprefixed in URLs, so `de` is never treated as a prefix.
 * The optional `locale` argument is kept for call-site clarity; stripping is
 * path-based so a mismatched claimed locale cannot leave `/en` in place.
 */
export function pathWithoutLocale(pathname: string, _locale?: Locale): string {
    let path = pathname;
    for (;;) {
        const firstSegment = path.split('/')[1];
        if (!isLocalePrefixSegment(firstSegment)) return path;
        path = path.slice(firstSegment.length + 1) || '/';
    }
}

/** Locale-prefixed absolute path (`/log-on` → `/en/log-on`). Default locale stays unprefixed. */
export function localePath(locale: CatalogLocale, path: `/${string}`): string {
    const unprefixed = pathWithoutLocale(path);
    if (locale === DEFAULT_LOCALE) return unprefixed;
    return unprefixed === '/' ? `/${locale}` : `/${locale}${unprefixed}`;
}
