import type { I18nWebNamespace } from './namespaces';

/** Admin shell + shared cook inventory cards (`CookMealCard`, `CookMenuCard`, …). */
export const ADMIN_I18N_NAMESPACES = ['common', 'public', 'admin', 'profileCook'] as const satisfies readonly I18nWebNamespace[];

/** Signed-in chrome both roles share. Role catalogs are loaded by the profile layout. */
export const PROFILE_I18N_NAMESPACES = ['common', 'public', 'profile'] as const satisfies readonly I18nWebNamespace[];

function pathWithoutQuery(pathname: string): string {
    const q = pathname.indexOf('?');
    return q === -1 ? pathname : pathname.slice(0, q);
}

function uniqueNamespaces(namespaces: readonly I18nWebNamespace[]): I18nWebNamespace[] {
    return [...new Set(namespaces)];
}

function isAdminPath(path: string): boolean {
    return path === '/admin' || path.startsWith('/admin/');
}

function isProfilePath(path: string): boolean {
    return path === '/profile' || path.startsWith('/profile/');
}

function isPublicBookingPath(path: string): boolean {
    return (
        path === '/booking-request' ||
        path === '/booking-request/form' ||
        path === '/booking-request/plan' ||
        path === '/booking-request/chat' ||
        /^\/booking-request\/[^/]+\/submitted$/.test(path)
    );
}

/** Customer booking detail/edit reuse `publicBooking` form-default helpers. */
function isProfilePublicBookingPath(path: string): boolean {
    return /^\/profile\/booking-requests\/[^/]+(?:\/edit)?$/.test(path);
}

/** Admin booking create/edit reuse `publicBooking` form-default helpers (occasions, preferences, restrictions). */
function isAdminPublicBookingPath(path: string): boolean {
    return path === '/admin/booking-requests/create' || /^\/admin\/booking-requests\/[^/]+\/edit$/.test(path);
}

/** Admin account and user forms embed profile chrome (`AccountPage`, `ProfilePictureEditor`). */
function isAdminProfileChromePath(path: string): boolean {
    return path === '/admin/account' || /^\/admin\/users\/[^/]+/.test(path);
}

/**
 * Profile routes either role can open. The static checker treats both role catalogs as
 * available so shared pages can import either shell.
 */
function isProfileSharedPath(path: string): boolean {
    return (
        path === '/profile' ||
        path === '/profile/account' ||
        /^\/profile\/support-requests(?:\/|$)/.test(path) ||
        /^\/profile\/assistant(?:\/|$)/.test(path)
    );
}

/** Customer-only profile URLs (`ProfileCustomerShell`). Cooks use a different tree. */
function isProfileCustomerOnlyPath(path: string): boolean {
    return /^\/profile\/booking-requests(?:\/|$)/.test(path) || path === '/profile/gift-cards';
}

/** Offer surfaces that render the other role’s cards (cook menu cards on guest offer, guest offer card on cook create). */
function isProfileCrossRoleCatalogPath(path: string): boolean {
    return (
        /^\/profile\/booking-requests\/[^/]+\/offers(?:\/|$)/.test(path) || /^\/profile\/booking-request-pool\/[^/]+\/create$/.test(path)
    );
}

/** Role catalogs the `/profile` loader adds on top of `namespacesForPath`. */
function profileRoleCatalogsForPath(pathname: string): readonly I18nWebNamespace[] {
    const path = pathWithoutQuery(pathname);
    if (!isProfilePath(path)) return [];
    if (isProfileSharedPath(path) || isProfileCrossRoleCatalogPath(path)) return ['profileCook', 'profileCustomer'];
    if (isProfileCustomerOnlyPath(path)) return ['profileCustomer'];
    return ['profileCook'];
}

/** Web namespaces the locale layout should preload for this unprefixed path. */
export function namespacesForPath(pathname: string): I18nWebNamespace[] {
    const path = pathWithoutQuery(pathname);
    if (isAdminPath(path)) {
        const extra: I18nWebNamespace[] = [];
        if (isAdminPublicBookingPath(path)) extra.push('publicBooking');
        if (isAdminProfileChromePath(path)) extra.push('profile');
        return extra.length > 0 ? [...ADMIN_I18N_NAMESPACES, ...extra] : [...ADMIN_I18N_NAMESPACES];
    }
    if (isProfilePath(path)) {
        if (isProfilePublicBookingPath(path)) return [...PROFILE_I18N_NAMESPACES, 'publicBooking'];
        return [...PROFILE_I18N_NAMESPACES];
    }
    if (isPublicBookingPath(path)) return ['common', 'public', 'publicBooking'];
    return ['common', 'public'];
}

/**
 * Catalogs that must be in cache when this path paints: locale-layout preload plus
 * profile role catalogs the `/profile` loader adds. Nested `I18nProvider`s use the
 * same path list (admin) or `namespacesLoadedForProfileSession` (profile).
 */
export function namespacesLoadedForPath(pathname: string): I18nWebNamespace[] {
    return uniqueNamespaces([...namespacesForPath(pathname), ...profileRoleCatalogsForPath(pathname)]);
}

/** Path catalogs plus the signed-in role, so cook chrome still resolves on any profile URL. */
export function namespacesLoadedForProfileSession(pathname: string, isCook: boolean): I18nWebNamespace[] {
    const role: I18nWebNamespace = isCook ? 'profileCook' : 'profileCustomer';
    return uniqueNamespaces([...namespacesLoadedForPath(pathname), role]);
}
