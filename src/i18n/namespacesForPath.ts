import type { I18nWebNamespace } from './namespaces';

/** Admin shell + shared cook inventory cards (`CookMealCard`, `CookMenuCard`, …). */
export const ADMIN_I18N_NAMESPACES = ['common', 'public', 'admin', 'profileCook'] as const satisfies readonly I18nWebNamespace[];

function pathWithoutQuery(pathname: string): string {
    const q = pathname.indexOf('?');
    return q === -1 ? pathname : pathname.slice(0, q);
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

/** Web namespaces the locale layout should preload for this unprefixed path. */
export function namespacesForPath(pathname: string): I18nWebNamespace[] {
    const path = pathWithoutQuery(pathname);
    if (isAdminPath(path)) {
        if (isAdminPublicBookingPath(path)) return [...ADMIN_I18N_NAMESPACES, 'publicBooking'];
        return [...ADMIN_I18N_NAMESPACES];
    }
    if (isProfilePath(path)) {
        if (isProfilePublicBookingPath(path)) return ['common', 'public', 'publicBooking', 'profile'];
        return ['common', 'public', 'profile'];
    }
    if (isPublicBookingPath(path)) return ['common', 'public', 'publicBooking'];
    return ['common', 'public'];
}
