import type { Locale } from '../../utils/locale';

export type AdminPromoCodesSection = 'list' | 'create';

export const ADMIN_PROMO_CODES_SECTIONS: AdminPromoCodesSection[] = ['list', 'create'];

export type AdminPromoCodesSectionTo = '/{-$locale}/admin/promo-codes' | '/{-$locale}/admin/promo-codes/create';

export function adminPromoCodesSectionLabel(section: AdminPromoCodesSection, locale: Locale): string {
    return (
        {
            list: { de: 'Liste', en: 'List' },
            create: { de: 'Anlegen', en: 'Create' },
        } as const
    )[section][locale];
}

export function adminPromoCodesSectionPath(section: AdminPromoCodesSection): '/admin/promo-codes' | '/admin/promo-codes/create' {
    return section === 'list' ? '/admin/promo-codes' : '/admin/promo-codes/create';
}

export function adminPromoCodesSectionTo(section: AdminPromoCodesSection): AdminPromoCodesSectionTo {
    return section === 'list' ? '/{-$locale}/admin/promo-codes' : '/{-$locale}/admin/promo-codes/create';
}

export function parseAdminPromoCodesSectionFromPath(path: string): AdminPromoCodesSection | undefined {
    for (const section of ADMIN_PROMO_CODES_SECTIONS) {
        if (path === adminPromoCodesSectionPath(section)) {
            return section;
        }
    }
    return undefined;
}
