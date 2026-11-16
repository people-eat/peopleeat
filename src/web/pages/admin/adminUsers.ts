import { t } from '../../../i18n/t';
import type { Locale } from '../../utils/locale';

export type AdminUsersSection = 'list' | 'create';

export const ADMIN_USERS_SECTIONS: AdminUsersSection[] = ['list', 'create'];

export type AdminUsersSectionTo = '/{-$locale}/admin/users/list' | '/{-$locale}/admin/users/create';

export function adminUsersSectionLabel(section: AdminUsersSection, locale: Locale): string {
    return t(locale, 'admin', `section.${section}`);
}

export function adminUsersSectionPath(section: AdminUsersSection): `/admin/users/${AdminUsersSection}` {
    return `/admin/users/${section}`;
}

export function adminUsersSectionTo(section: AdminUsersSection): AdminUsersSectionTo {
    return `/{-$locale}/admin/users/${section}`;
}

export function parseAdminUsersSectionFromPath(path: string): AdminUsersSection | undefined {
    for (const section of ADMIN_USERS_SECTIONS) {
        if (path === adminUsersSectionPath(section)) {
            return section;
        }
    }
    return undefined;
}
