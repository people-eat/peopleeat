import { i18nCreateSync } from '../i18n/i18nCreate';
import { t } from '../i18n/t';
import { formatCurrency } from './formatCurrency';
import type { Locale } from './locale';

export const bookingRequestPriceClassTypes = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type BookingRequestFormPriceClassType = (typeof bookingRequestPriceClassTypes)[number];

function catalogStringList(locale: Locale, key: string): string[] {
    const instance = i18nCreateSync(locale, ['common', 'publicBooking']);
    const value = (instance.t as (k: string, o: { ns: string; returnObjects: true }) => unknown)(key, {
        ns: 'publicBooking',
        returnObjects: true,
    });
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
        throw new Error(`Expected string[] at publicBooking:${key}`);
    }
    return value;
}

export function defaultBookingRequestOccasions(locale: Locale): string[] {
    return catalogStringList(locale, 'formDefaults.occasions');
}

export function defaultBookingRequestPreferences(locale: Locale): string[] {
    return catalogStringList(locale, 'formDefaults.preferences');
}

/** Default dietary restriction / allergen chips for booking-request participants. */
export function defaultBookingRequestRestrictions(locale: Locale): string[] {
    return catalogStringList(locale, 'formDefaults.restrictions');
}

export type BookingRequestPriceClassInfo = {
    title: string;
    description: string;
    commonOccasions: string[];
    minimumAmountPerPersonCents: number;
    isPopular: boolean;
};

const priceClassMinimumCents: Record<BookingRequestFormPriceClassType, number> = {
    LOW: 7500,
    MEDIUM: 9000,
    HIGH: 12000,
};

export function bookingRequestPriceClassInfo(type: BookingRequestFormPriceClassType, locale: Locale): BookingRequestPriceClassInfo {
    return {
        title: t(locale, 'publicBooking', `formDefaults.priceClasses.${type}.title`),
        description: t(locale, 'publicBooking', `formDefaults.priceClasses.${type}.description`),
        commonOccasions: catalogStringList(locale, `formDefaults.priceClasses.${type}.commonOccasions`),
        minimumAmountPerPersonCents: priceClassMinimumCents[type],
        isPopular: type === 'MEDIUM',
    };
}

/** Compact detail/email label: `Prestige Experience (ab 120,00 € p.P.)`. */
export function bookingRequestPriceClassLabel(type: BookingRequestFormPriceClassType, locale: Locale): string {
    const info = bookingRequestPriceClassInfo(type, locale);
    const minimum = formatCurrency(info.minimumAmountPerPersonCents, { locale });
    return t(locale, 'publicBooking', 'formDefaults.priceClassLabel', { title: info.title, minimum });
}

export function bookingRequestPriceClassCustomLabel(locale: Locale): string {
    return t(locale, 'publicBooking', 'formDefaults.priceClassCustom');
}

/** Default event time: ~3 weeks out at 19:00 local. */
export function defaultBookingRequestDateTime(now = new Date()): Date {
    const date = new Date(now);
    date.setDate(date.getDate() + 21);
    date.setHours(19, 0, 0, 0);
    return date;
}
