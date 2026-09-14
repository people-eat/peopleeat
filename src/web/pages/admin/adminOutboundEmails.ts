import type { Locale } from '../../utils/locale';

export type AdminOutboundEmailsSection = 'list';

export const ADMIN_OUTBOUND_EMAILS_SECTIONS: AdminOutboundEmailsSection[] = ['list'];

export type AdminOutboundEmailsSectionTo = '/{-$locale}/admin/outbound-emails/list';

export function adminOutboundEmailsSectionLabel(section: AdminOutboundEmailsSection, locale: Locale): string {
    return (
        {
            list: { de: 'Liste', en: 'List' },
        } as const
    )[section][locale];
}

export function adminOutboundEmailsSectionPath(
    section: AdminOutboundEmailsSection,
): `/admin/outbound-emails/${AdminOutboundEmailsSection}` {
    return `/admin/outbound-emails/${section}`;
}

export function adminOutboundEmailsSectionTo(section: AdminOutboundEmailsSection): AdminOutboundEmailsSectionTo {
    return `/{-$locale}/admin/outbound-emails/${section}`;
}

export function parseAdminOutboundEmailsSectionFromPath(path: string): AdminOutboundEmailsSection | undefined {
    for (const section of ADMIN_OUTBOUND_EMAILS_SECTIONS) {
        if (path === adminOutboundEmailsSectionPath(section)) {
            return section;
        }
    }
    return undefined;
}
