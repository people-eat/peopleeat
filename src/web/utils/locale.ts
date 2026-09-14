import { DEFAULT_LOCALE, LOCALES } from '../../shared/locale';
import type { Locale } from '../../shared/locale';

export { DEFAULT_LOCALE, LOCALES } from '../../shared/locale';
export type { Locale } from '../../shared/locale';

export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
    if (!header) return DEFAULT_LOCALE;
    const preferred = header
        .split(',')
        .map((part) => {
            const [lang, q] = part.trim().split(';q=');
            return { lang: lang!.split('-')[0]!.toLowerCase(), q: q ? parseFloat(q) : 1 };
        })
        .sort((a, b) => b.q - a.q);
    for (const { lang } of preferred) {
        if (LOCALES.includes(lang as Locale)) return lang as Locale;
    }
    return DEFAULT_LOCALE;
}

// Same logic as `useLocale()` but works in non-component contexts (e.g.
// TanStack Router's `head()` callback, which runs without React hooks).
export function localeFromParam(params: { locale?: string | undefined } | undefined): Locale {
    const locale = params?.locale;
    if (locale && LOCALES.includes(locale as Locale)) return locale as Locale;
    return DEFAULT_LOCALE;
}

/** True when the first path segment is a non-default locale prefix (`en`, …). */
function isLocalePrefixSegment(segment: string | undefined): segment is Locale {
    return !!segment && LOCALES.includes(segment as Locale) && segment !== DEFAULT_LOCALE;
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
export function localePath(locale: Locale, path: `/${string}`): string {
    const unprefixed = pathWithoutLocale(path);
    if (locale === DEFAULT_LOCALE) return unprefixed;
    return unprefixed === '/' ? `/${locale}` : `/${locale}${unprefixed}`;
}

/**
 * Workspace shells lock the document and scroll an inset pane instead.
 * Those routes opt out of `html { scrollbar-gutter: stable both-edges }` via
 * `.workspace-no-document-scroll` — see docs/styles/theme.md.
 */
export function isWorkspaceNoDocumentScrollPath(path: string): boolean {
    return (
        path === '/admin' ||
        path.startsWith('/admin/') ||
        path === '/profile' ||
        path.startsWith('/profile/') ||
        path === '/booking-request/form' ||
        /^\/booking-request\/[^/]+\/submitted$/.test(path)
    );
}

/**
 * Rewrite the current pathname to `targetLocale`.
 * Strips any existing locale prefix from the path (not from `currentLocale`)
 * so detection / switcher never build `/en/en/…`.
 */
export function buildLocalePath(pathname: string, _currentLocale: Locale, targetLocale: Locale): string {
    return localePath(targetLocale, pathWithoutLocale(pathname) as `/${string}`);
}

export function setLocaleCookie(locale: Locale): void {
    document.cookie = `locale=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

/**
 * Full document navigation after `terminateSessions` for the current device.
 * SPA navigate would leave root-mounted URQL consumers (cookie banner, legal
 * gate) on the terminated session’s cached shape; a hard load lets
 * `sessionUpsert` mint a new anonymous session and remount those probes.
 */
export function redirectAfterSignOut(locale: Locale): void {
    window.location.assign(localePath(locale, '/log-on'));
}
