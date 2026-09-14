import type { Locale } from '../../utils/locale';

export type AdminCallsSection = 'list';

export const ADMIN_CALLS_SECTIONS: AdminCallsSection[] = ['list'];

export type AdminCallsSectionTo = '/{-$locale}/admin/calls/list';

export function adminCallsSectionLabel(section: AdminCallsSection, locale: Locale): string {
    return (
        {
            list: { de: 'Liste', en: 'List' },
        } as const
    )[section][locale];
}

export function adminCallsSectionPath(section: AdminCallsSection): `/admin/calls/${AdminCallsSection}` {
    return `/admin/calls/${section}`;
}

export function adminCallsSectionTo(section: AdminCallsSection): AdminCallsSectionTo {
    return `/{-$locale}/admin/calls/${section}`;
}

export function parseAdminCallsSectionFromPath(path: string): AdminCallsSection | undefined {
    for (const section of ADMIN_CALLS_SECTIONS) {
        if (path === adminCallsSectionPath(section)) {
            return section;
        }
    }
    return undefined;
}
