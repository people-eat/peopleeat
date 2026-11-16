import { t } from '../../../i18n/t';
import type { Locale } from '../../utils/locale';

export type AdminGiftCardsSection = 'list';

export const ADMIN_GIFT_CARDS_SECTIONS: AdminGiftCardsSection[] = ['list'];

export type AdminGiftCardsSectionTo = '/{-$locale}/admin/gift-cards/list';

export function adminGiftCardsSectionLabel(section: AdminGiftCardsSection, locale: Locale): string {
    return t(locale, 'admin', `section.${section}`);
}

export function adminGiftCardsSectionPath(section: AdminGiftCardsSection): `/admin/gift-cards/${AdminGiftCardsSection}` {
    return `/admin/gift-cards/${section}`;
}

export function adminGiftCardsSectionTo(section: AdminGiftCardsSection): AdminGiftCardsSectionTo {
    return `/{-$locale}/admin/gift-cards/${section}`;
}

export function parseAdminGiftCardsSectionFromPath(path: string): AdminGiftCardsSection | undefined {
    for (const section of ADMIN_GIFT_CARDS_SECTIONS) {
        if (path === adminGiftCardsSectionPath(section)) {
            return section;
        }
    }
    return undefined;
}

export function adminGiftCardOccasionLabel(occasion: string, locale: Locale): string {
    const key = `giftCards.occasions.${occasion}`;
    const translated = t(locale, 'admin', key);
    return translated === key ? occasion : translated;
}
