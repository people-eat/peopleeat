import type { Locale } from '../../utils/locale';

export type AdminLogsSection = 'list';

export const ADMIN_LOGS_SECTIONS: AdminLogsSection[] = ['list'];

export type AdminLogsSectionTo = '/{-$locale}/admin/logs/list';

export function adminLogsSectionLabel(section: AdminLogsSection, locale: Locale): string {
    return (
        {
            list: { de: 'Liste', en: 'List' },
        } as const
    )[section][locale];
}

export function adminLogsSectionPath(section: AdminLogsSection): `/admin/logs/${AdminLogsSection}` {
    return `/admin/logs/${section}`;
}

export function adminLogsSectionTo(section: AdminLogsSection): AdminLogsSectionTo {
    return `/{-$locale}/admin/logs/${section}`;
}

export function parseAdminLogsSectionFromPath(path: string): AdminLogsSection | undefined {
    for (const section of ADMIN_LOGS_SECTIONS) {
        if (path === adminLogsSectionPath(section)) {
            return section;
        }
    }
    return undefined;
}
