import type { Locale } from '../../utils/locale';

export type AdminSessionsSection = 'list';

export const ADMIN_SESSIONS_SECTIONS: AdminSessionsSection[] = ['list'];

export type AdminSessionsSectionTo = '/{-$locale}/admin/sessions/list';

export function adminSessionsSectionLabel(section: AdminSessionsSection, locale: Locale): string {
    return (
        {
            list: { de: 'Liste', en: 'List' },
        } as const
    )[section][locale];
}

export function adminSessionsSectionPath(section: AdminSessionsSection): `/admin/sessions/${AdminSessionsSection}` {
    return `/admin/sessions/${section}`;
}

export function adminSessionsSectionTo(section: AdminSessionsSection): AdminSessionsSectionTo {
    return `/{-$locale}/admin/sessions/${section}`;
}

export function parseAdminSessionsSectionFromPath(path: string): AdminSessionsSection | undefined {
    for (const section of ADMIN_SESSIONS_SECTIONS) {
        if (path === adminSessionsSectionPath(section)) {
            return section;
        }
    }
    return undefined;
}

export function adminSessionKindLabel(kind: 'human' | 'bot', locale: Locale): string {
    return (
        {
            human: { de: 'Mensch', en: 'Human' },
            bot: { de: 'Bot', en: 'Bot' },
        } as const
    )[kind][locale];
}
