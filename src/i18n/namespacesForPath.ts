import type { I18nWebNamespace } from './namespaces';

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

/** Web namespaces the locale layout should preload for this unprefixed path. */
export function namespacesForPath(pathname: string): I18nWebNamespace[] {
    const path = pathWithoutQuery(pathname);
    if (isAdminPath(path)) return ['common', 'public', 'admin'];
    if (isProfilePath(path)) {
        if (isProfilePublicBookingPath(path)) return ['common', 'public', 'publicBooking', 'profile'];
        return ['common', 'public', 'profile'];
    }
    if (isPublicBookingPath(path)) return ['common', 'public', 'publicBooking'];
    return ['common', 'public'];
}
