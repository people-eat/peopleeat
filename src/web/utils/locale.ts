import { DEFAULT_LOCALE, isLocale, localePath, pathWithoutLocale } from '../../shared/locale';
import type { CatalogLocale, Locale } from '../../shared/locale';

export { CATALOG_LOCALES, DEFAULT_LOCALE, isLocale, localeAwareHref, localePath, pathWithoutLocale } from '../../shared/locale';
export type { CatalogLocale, Locale } from '../../shared/locale';

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
        if (isLocale(lang)) return lang;
    }
    return DEFAULT_LOCALE;
}

// Same logic as `useLocale()` but works in non-component contexts (e.g.
// TanStack Router's `head()` callback, which runs without React hooks).
export function localeFromParam(params: { locale?: string | undefined } | undefined): Locale {
    const locale = params?.locale;
    if (isLocale(locale)) return locale;
    return DEFAULT_LOCALE;
}

/**
 * Workspace shells lock the document and scroll an inset pane instead.
 * Those routes opt out of `html { scrollbar-gutter: stable }` via
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
export function buildLocalePath(pathname: string, _currentLocale: CatalogLocale, targetLocale: CatalogLocale): string {
    return localePath(targetLocale, pathWithoutLocale(pathname) as `/${string}`);
}

/**
 * Rewrite the current location to `targetLocale`, keeping `searchStr` and `hash`.
 * Use for language switches and first-visit redirects so `?tab=` (and similar) survive.
 */
export function buildLocaleHref(
    location: { pathname: string; searchStr?: string; hash?: string },
    currentLocale: CatalogLocale,
    targetLocale: CatalogLocale,
): string {
    return `${buildLocalePath(location.pathname, currentLocale, targetLocale)}${location.searchStr ?? ''}${location.hash ?? ''}`;
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
