import { formatCurrency } from './formatCurrency';
import type { Locale } from './locale';

export const bookingRequestPriceClassTypes = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type BookingRequestFormPriceClassType = (typeof bookingRequestPriceClassTypes)[number];

export function defaultBookingRequestOccasions(locale: Locale): string[] {
    return {
        de: ['Geburtstag', 'Romantisches Dinner', 'Hochzeit', 'Familienfest', 'Treffen mit Freunden', 'Team Event'],
        en: ['Birthday', 'Romantic Dinner', 'Wedding', 'Family Party', 'Meet with Friends', 'Team Event'],
    }[locale];
}

export function defaultBookingRequestPreferences(locale: Locale): string[] {
    return {
        de: [
            'Italienisch',
            'Französisch',
            'Asiatisch',
            'Vegetarisch',
            'Vegan',
            'Mediterran',
            'BBQ',
            'Meeresfrüchte',
            'Fisch',
            'Fleisch',
            'Sharing Plates',
        ],
        en: ['Italian', 'French', 'Asian', 'Vegetarian', 'Vegan', 'Mediterranean', 'BBQ', 'Seafood', 'Fish', 'Meat', 'Sharing Plates'],
    }[locale];
}

/** Default dietary restriction / allergen chips for booking-request participants. */
export function defaultBookingRequestRestrictions(locale: Locale): string[] {
    return {
        de: [
            'Gluten / Weizen',
            'Nüsse',
            'Erdnüsse',
            'Milch / Laktose',
            'Eier',
            'Soja',
            'Fisch',
            'Schalentiere',
            'Weichtiere',
            'Sesam',
            'Sellerie',
            'Senf',
            'Lupinen',
            'Fruktose',
            'Histamin',
            'Sorbit',
            'Vegetarisch',
            'Vegan',
            'Halal',
            'Koscher',
            'Kein Schweinefleisch',
            'Alkoholverzicht',
        ],
        en: [
            'Gluten / Wheat',
            'Nuts',
            'Peanuts',
            'Milk / Lactose',
            'Eggs',
            'Soy',
            'Fish',
            'Crustaceans',
            'Molluscs',
            'Sesame',
            'Celery',
            'Mustard',
            'Lupin',
            'Fructose',
            'Histamine',
            'Sorbitol',
            'Vegetarian',
            'Vegan',
            'Halal',
            'Kosher',
            'No pork',
            'No alcohol',
        ],
    }[locale];
}

export type BookingRequestPriceClassInfo = {
    title: string;
    description: string;
    commonOccasions: string[];
    minimumAmountPerPersonCents: number;
    isPopular: boolean;
};

export function bookingRequestPriceClassInfo(type: BookingRequestFormPriceClassType, locale: Locale): BookingRequestPriceClassInfo {
    if (type === 'LOW') {
        return {
            title: 'Casual Dining',
            description: {
                de: 'Für Abende, bei denen es einfach ums Zusammensein geht.',
                en: "For evenings where it's simply about being together.",
            }[locale],
            commonOccasions: {
                de: ['JGAs', 'Hochzeitsfeiern', 'Team Events', 'Kochkurse'],
                en: ['Bachelor parties', 'Wedding celebrations', 'Team Events', 'Cooking classes'],
            }[locale],
            minimumAmountPerPersonCents: 7500,
            isPopular: false,
        };
    }
    if (type === 'MEDIUM') {
        return {
            title: 'Signature Menü',
            description: {
                de: 'Wenn du als Gastgeber mehr willst als ein gutes Essen.',
                en: 'If you, as a host, want more than just a good meal.',
            }[locale],
            commonOccasions: {
                de: ['Familientreffen', 'Abende mit Freunden', 'Dinner in Ferienwohnungen'],
                en: ['Family gatherings', 'Evenings with friends', 'Dinners in holiday apartments'],
            }[locale],
            minimumAmountPerPersonCents: 9000,
            isPopular: true,
        };
    }
    return {
        title: 'Prestige Experience',
        description: {
            de: 'Für Anlässe, an denen besondere Erinnerungen entstehen.',
            en: 'For occasions that create special memories.',
        }[locale],
        commonOccasions: {
            de: ['Jubiläen', 'Candlelight Dinner', 'Besondere Anlässe'],
            en: ['Anniversaries', 'Candlelight Dinners', 'Special Occasions'],
        }[locale],
        minimumAmountPerPersonCents: 12000,
        isPopular: false,
    };
}

/** Compact detail/email label: `Prestige Experience (ab 120,00 € p.P.)`. */
export function bookingRequestPriceClassLabel(type: BookingRequestFormPriceClassType, locale: Locale): string {
    const info = bookingRequestPriceClassInfo(type, locale);
    const minimum = formatCurrency(info.minimumAmountPerPersonCents, { locale });
    return {
        de: `${info.title} (ab ${minimum} p.P.)`,
        en: `${info.title} (from ${minimum} p.p.)`,
    }[locale];
}

/** Default event time: ~3 weeks out at 19:00 local. */
export function defaultBookingRequestDateTime(now = new Date()): Date {
    const date = new Date(now);
    date.setDate(date.getDate() + 21);
    date.setHours(19, 0, 0, 0);
    return date;
}
