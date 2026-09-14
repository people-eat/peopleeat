import type { Locale } from '../../utils/locale';

export type AdminBookingRequestsSection = 'list' | 'create';

export const ADMIN_BOOKING_REQUESTS_SECTIONS: AdminBookingRequestsSection[] = ['list', 'create'];

export type AdminBookingRequestsSectionTo = '/{-$locale}/admin/booking-requests/list' | '/{-$locale}/admin/booking-requests/create';

export function adminBookingRequestsSectionLabel(section: AdminBookingRequestsSection, locale: Locale): string {
    return (
        {
            list: { de: 'Liste', en: 'List' },
            create: { de: 'Anlegen', en: 'Create' },
        } as const
    )[section][locale];
}

export function adminBookingRequestsSectionPath(
    section: AdminBookingRequestsSection,
): `/admin/booking-requests/${AdminBookingRequestsSection}` {
    return `/admin/booking-requests/${section}`;
}

export function adminBookingRequestsSectionTo(section: AdminBookingRequestsSection): AdminBookingRequestsSectionTo {
    return `/{-$locale}/admin/booking-requests/${section}`;
}

export function parseAdminBookingRequestsSectionFromPath(path: string): AdminBookingRequestsSection | undefined {
    for (const section of ADMIN_BOOKING_REQUESTS_SECTIONS) {
        if (path === adminBookingRequestsSectionPath(section)) {
            return section;
        }
    }
    return undefined;
}
