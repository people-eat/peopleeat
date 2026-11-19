export const CATALOG_LOCALES = ['de', 'en', 'fr', 'it', 'ru', 'nl'] as const;
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
    nl: 'nl-NL',
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

/** Production public hosts. Staging / local hosts come from `siteHostnames` or `window.location`. */
const PEOPLE_EAT_SITE_HOSTS = new Set(['people-eat.com', 'www.people-eat.com']);

/** Dummy origin so `new URL('/path?x=1')` can parse site-relative hrefs. */
const SITE_RELATIVE_PARSE_BASE = 'https://people-eat.invalid';

export function isOnPlatformSiteHost(hostname: string, extraHostnames: readonly string[] = []): boolean {
    const host = hostname.toLowerCase().replace(/\.$/, '');
    if (PEOPLE_EAT_SITE_HOSTS.has(host)) return true;
    return extraHostnames.some((extra) => extra.toLowerCase().replace(/\.$/, '') === host);
}

/**
 * When `href` is on-platform (site-relative `/…`, or absolute on a known / provided
 * site host), return an unprefixed path + search + hash. External URLs return null.
 */
export function siteRelativeHrefFromUrl(href: string, options?: { siteHostnames?: readonly string[] }): string | null {
    const trimmed = href.trim();
    if (trimmed.length === 0) return null;

    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
        try {
            const parsed = new URL(trimmed, SITE_RELATIVE_PARSE_BASE);
            const path = pathWithoutLocale(parsed.pathname || '/') as `/${string}`;
            return `${path}${parsed.search}${parsed.hash}`;
        } catch {
            return null;
        }
    }

    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        if (!isOnPlatformSiteHost(parsed.hostname, options?.siteHostnames ?? [])) return null;
        const path = pathWithoutLocale(parsed.pathname || '/') as `/${string}`;
        return `${path}${parsed.search}${parsed.hash}`;
    } catch {
        return null;
    }
}

/**
 * Rewrite on-platform hrefs to the given locale. Site-relative paths and absolute
 * people-eat (or current-origin / provided) URLs become `localePath` links; external
 * http(s) URLs are returned unchanged.
 */
export function localeAwareHref(locale: CatalogLocale, href: string, options?: { siteHostnames?: readonly string[] }): string {
    const trimmed = href.trim();
    if (trimmed.length === 0) return trimmed;

    const siteHostnames = [...(options?.siteHostnames ?? [])];
    if (typeof globalThis !== 'undefined') {
        const locationHostname = (globalThis as { location?: { hostname?: string } }).location?.hostname;
        if (locationHostname) siteHostnames.push(locationHostname);
    }

    const siteRelative = siteRelativeHrefFromUrl(trimmed, { siteHostnames });
    if (siteRelative == null) return trimmed;

    const parsed = new URL(siteRelative, SITE_RELATIVE_PARSE_BASE);
    const localizedPath = localePath(locale, (parsed.pathname || '/') as `/${string}`);
    return `${localizedPath}${parsed.search}${parsed.hash}`;
}
