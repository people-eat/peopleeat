import type { Locale } from '../../utils/locale';

export type AdminGiftCardsSection = 'list';

export const ADMIN_GIFT_CARDS_SECTIONS: AdminGiftCardsSection[] = ['list'];

export type AdminGiftCardsSectionTo = '/{-$locale}/admin/gift-cards/list';

export function adminGiftCardsSectionLabel(section: AdminGiftCardsSection, locale: Locale): string {
    return (
        {
            list: { de: 'Liste', en: 'List' },
        } as const
    )[section][locale];
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

const GIFT_CARD_OCCASION_LABELS: Record<string, Record<Locale, string>> = {
    Geburtstag: { de: 'Geburtstag', en: 'Birthday' },
    Geburt: { de: 'Geburt', en: 'Birth' },
    Hochzeit: { de: 'Hochzeit', en: 'Wedding' },
    Jahrestag: { de: 'Jahrestag', en: 'Anniversary' },
    Dankeschön: { de: 'Dankeschön', en: 'Thank you' },
    Weihnachten: { de: 'Weihnachten', en: 'Christmas' },
    'Einfach so': { de: 'Einfach so', en: 'Just because' },
};

export function adminGiftCardOccasionLabel(occasion: string, locale: Locale): string {
    return GIFT_CARD_OCCASION_LABELS[occasion]?.[locale] ?? occasion;
}
