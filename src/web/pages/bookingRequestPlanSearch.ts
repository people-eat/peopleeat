import { bookingRequestPriceClassTypes, defaultBookingRequestDateTime } from '../../shared/bookingRequestFormDefaults';
import type { BookingRequestFormPriceClassType } from '../../shared/bookingRequestFormDefaults';
import type { GqlCUserBookingRequestExactEventAddressInput } from '../graphql/generated';
import {
    bookingRequestFormClampDateTime,
    bookingRequestFormDateTimeBoundsFromSearch,
    bookingRequestFormExactAddressFromSearch,
    bookingRequestFormHourOptions,
    bookingRequestFormMinuteOptions,
} from './bookingRequestFormSearch';
import type { BookingRequestFormDateTimeBounds, BookingRequestFormSearch } from './bookingRequestFormSearch';

export type BookingRequestPlanStep = 'details' | 'contact';

export const bookingRequestPlanCuisineKeys = ['mediterranean', 'regional', 'asian', 'chef'] as const;
export type BookingRequestPlanCuisineKey = (typeof bookingRequestPlanCuisineKeys)[number];

export type BookingRequestPlanSearch = {
    occasion?: string;
    dateTime?: string;
    minDateTime?: string;
    maxDateTime?: string;
    adults?: number;
    children?: number;
    message?: string;
    preferences?: string[];
    redeemCode?: string;
    location?: string;
    lat?: number;
    lng?: number;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    postCode?: string;
    state?: string;
    country?: string;
    partnerId?: string;
    firstName?: string;
    step?: BookingRequestPlanStep;
    cuisine?: BookingRequestPlanCuisineKey;
    priceClass?: BookingRequestFormPriceClassType;
};

export type BookingRequestPlanValues = {
    adultCount: number;
    discountedCount: number;
    locationSearchText: string;
    exactEventAddress: GqlCUserBookingRequestExactEventAddressInput | null;
    dateTime: Date;
    cuisine: BookingRequestPlanCuisineKey;
    priceClassType: BookingRequestFormPriceClassType;
    originalMessage: string;
    redeemCode: string;
    occasion: string;
};

function parsePositiveInt(value: unknown, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
        return Math.floor(value);
    }
    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number.parseInt(value, 10);
        if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }
    return fallback;
}

function parseOptionalNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
}

function parseOptionalIsoDateTime(value: unknown): string | undefined {
    if (typeof value !== 'string' || value.trim().length === 0) return undefined;
    const trimmed = value.trim();
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return trimmed;
}

function isPlanStep(value: unknown): value is BookingRequestPlanStep {
    return value === 'details' || value === 'contact';
}

function isCuisineKey(value: unknown): value is BookingRequestPlanCuisineKey {
    return typeof value === 'string' && (bookingRequestPlanCuisineKeys as readonly string[]).includes(value);
}

function isPriceClass(value: unknown): value is BookingRequestFormPriceClassType {
    return typeof value === 'string' && (bookingRequestPriceClassTypes as readonly string[]).includes(value);
}

function cuisineFromPreferences(preferences: string[] | undefined): BookingRequestPlanCuisineKey | undefined {
    if (!preferences || preferences.length === 0) return undefined;
    const first = preferences[0]?.trim().toLowerCase() ?? '';
    if (first.includes('mediterr') || first.includes('mediterranean')) return 'mediterranean';
    if (first.includes('regional') || first.includes('saison') || first.includes('season')) return 'regional';
    if (first.includes('asiat') || first.includes('asian')) return 'asian';
    if (first.includes('chef') || first.includes('empfehlung') || first.includes('recommend')) return 'chef';
    return undefined;
}

function parsePreferences(value: unknown): string[] | undefined {
    if (Array.isArray(value)) {
        const items = value
            .filter((item): item is string => typeof item === 'string')
            .map((item) => item.trim())
            .filter((item) => item.length > 0)
            .slice(0, 4);
        return items.length > 0 ? items : undefined;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
        const items = value
            .split('|')
            .map((item) => item.trim())
            .filter((item) => item.length > 0)
            .slice(0, 4);
        return items.length > 0 ? items : undefined;
    }
    return undefined;
}

export function bookingRequestPlanCuisineLabel(key: BookingRequestPlanCuisineKey, locale: 'de' | 'en'): string {
    return {
        mediterranean: { de: 'Mediterran', en: 'Mediterranean' },
        regional: { de: 'Regional & saisonal', en: 'Regional & seasonal' },
        asian: { de: 'Asiatisch inspiriert', en: 'Asian inspired' },
        chef: { de: 'Empfehlung des Chefs', en: "Chef's recommendation" },
    }[key][locale];
}

export function bookingRequestPlanCuisineSubtitle(key: BookingRequestPlanCuisineKey, locale: 'de' | 'en'): string {
    return {
        mediterranean: { de: 'Sonne, Kräuter & leichte Aromen', en: 'Sun, herbs & light flavors' },
        regional: { de: 'Vertraute Zutaten, neu interpretiert', en: 'Familiar ingredients, newly interpreted' },
        asian: { de: 'Frische Kräuter & spannende Aromen', en: 'Fresh herbs & exciting flavors' },
        chef: { de: 'Wir finden gemeinsam eure Richtung', en: 'We find your direction together' },
    }[key][locale];
}

export function bookingRequestPlanCuisinePreference(key: BookingRequestPlanCuisineKey, locale: 'de' | 'en'): string {
    return bookingRequestPlanCuisineLabel(key, locale);
}

export function parseBookingRequestPlanSearch(search: Record<string, unknown>): BookingRequestPlanSearch {
    const occasion = typeof search.occasion === 'string' && search.occasion.trim().length > 0 ? search.occasion.trim() : undefined;
    const dateTime = typeof search.dateTime === 'string' && search.dateTime.trim().length > 0 ? search.dateTime.trim() : undefined;
    const minDateTime = parseOptionalIsoDateTime(search.minDateTime);
    const maxDateTime = parseOptionalIsoDateTime(search.maxDateTime);
    const adultsRaw = search.adults ?? search.adultCount;
    const childrenRaw = search.children ?? search.discountedCount;
    const adults = adultsRaw == null ? undefined : Math.max(1, parsePositiveInt(adultsRaw, 4));
    const children = childrenRaw == null ? undefined : parsePositiveInt(childrenRaw, 0);
    const message = typeof search.message === 'string' && search.message.trim().length > 0 ? search.message : undefined;
    const preferences = parsePreferences(search.preferences);
    const redeemCode = typeof search.redeemCode === 'string' && search.redeemCode.trim().length > 0 ? search.redeemCode.trim() : undefined;
    const location = typeof search.location === 'string' && search.location.trim().length > 0 ? search.location.trim() : undefined;
    const lat = parseOptionalNumber(search.lat);
    const lng = parseOptionalNumber(search.lng);
    const addressLine1 = typeof search.addressLine1 === 'string' && search.addressLine1.trim().length > 0 ? search.addressLine1 : undefined;
    const addressLine2 = typeof search.addressLine2 === 'string' && search.addressLine2.trim().length > 0 ? search.addressLine2 : undefined;
    const city = typeof search.city === 'string' && search.city.trim().length > 0 ? search.city : undefined;
    const postCode = typeof search.postCode === 'string' && search.postCode.trim().length > 0 ? search.postCode : undefined;
    const state = typeof search.state === 'string' && search.state.trim().length > 0 ? search.state : undefined;
    const country = typeof search.country === 'string' && search.country.trim().length > 0 ? search.country : undefined;
    const partnerId = typeof search.partnerId === 'string' && search.partnerId.trim().length > 0 ? search.partnerId.trim() : undefined;
    const firstName = typeof search.firstName === 'string' && search.firstName.trim().length > 0 ? search.firstName.trim() : undefined;
    const step = isPlanStep(search.step) ? search.step : undefined;
    const cuisine = isCuisineKey(search.cuisine) ? search.cuisine : cuisineFromPreferences(preferences);
    const priceClass = isPriceClass(search.priceClass) ? search.priceClass : undefined;

    const bounds = bookingRequestFormDateTimeBoundsFromSearch({ minDateTime, maxDateTime });

    return {
        occasion,
        dateTime,
        minDateTime: bounds.minDateTime ? minDateTime : undefined,
        maxDateTime: bounds.maxDateTime ? maxDateTime : undefined,
        adults,
        children,
        message,
        preferences,
        redeemCode,
        location,
        lat,
        lng,
        addressLine1,
        addressLine2,
        city,
        postCode,
        state,
        country,
        partnerId,
        firstName,
        step,
        cuisine,
        priceClass,
    };
}

function planSearchAsFormVenue(search: BookingRequestPlanSearch): BookingRequestFormSearch {
    // Venue-only projection — omit `step` / plan-only fields so the form helper accepts it.
    const venue: BookingRequestFormSearch = {
        location: search.location,
        lat: search.lat,
        lng: search.lng,
        addressLine1: search.addressLine1,
        addressLine2: search.addressLine2,
        city: search.city,
        postCode: search.postCode,
        state: search.state,
        country: search.country,
        minDateTime: search.minDateTime,
        maxDateTime: search.maxDateTime,
    };
    return venue;
}

export function bookingRequestPlanResolveVenue(input: {
    search: BookingRequestPlanSearch;
    partnerDefaultAddress?: GqlCUserBookingRequestExactEventAddressInput | null;
}): GqlCUserBookingRequestExactEventAddressInput | null {
    const fromUrl = bookingRequestFormExactAddressFromSearch(planSearchAsFormVenue(input.search));
    if (fromUrl) return fromUrl;
    return input.partnerDefaultAddress ?? null;
}

export function bookingRequestPlanValuesFromSearch(
    search: BookingRequestPlanSearch,
    partnerDefaultAddress?: GqlCUserBookingRequestExactEventAddressInput | null,
): BookingRequestPlanValues {
    const exactEventAddress = bookingRequestPlanResolveVenue({ search, partnerDefaultAddress });
    const bounds = bookingRequestFormDateTimeBoundsFromSearch({
        minDateTime: search.minDateTime,
        maxDateTime: search.maxDateTime,
    });
    const parsedDate = search.dateTime ? new Date(search.dateTime) : null;
    let rawDateTime = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : defaultBookingRequestDateTime();
    // Default dinner start 19:00 when no explicit time was provided.
    if (!search.dateTime) {
        rawDateTime = new Date(rawDateTime);
        rawDateTime.setHours(19, 0, 0, 0);
    }
    const dateTime = bookingRequestFormClampDateTime(rawDateTime, bounds);

    return {
        adultCount: search.adults ?? 4,
        discountedCount: search.children ?? 0,
        locationSearchText: exactEventAddress?.displayText ?? search.location ?? '',
        exactEventAddress,
        dateTime,
        cuisine: search.cuisine ?? 'chef',
        priceClassType: search.priceClass ?? 'MEDIUM',
        originalMessage: search.message ?? '',
        redeemCode: search.redeemCode ?? '',
        occasion: search.occasion ?? '',
    };
}

export function bookingRequestPlanSearchFromValues(input: {
    values: BookingRequestPlanValues;
    step: BookingRequestPlanStep;
    partnerId?: string;
    firstName?: string;
    minDateTime?: string;
    maxDateTime?: string;
}): BookingRequestPlanSearch {
    const { values, step, partnerId, firstName, minDateTime, maxDateTime } = input;
    const address = values.exactEventAddress;
    const preference = bookingRequestPlanCuisinePreference(values.cuisine, 'de');
    return {
        occasion: values.occasion.trim() || undefined,
        dateTime: values.dateTime.toISOString(),
        minDateTime,
        maxDateTime,
        adults: values.adultCount,
        children: values.discountedCount > 0 ? values.discountedCount : undefined,
        message: values.originalMessage.trim() || undefined,
        preferences: [preference],
        cuisine: values.cuisine,
        priceClass: values.priceClassType === 'MEDIUM' ? undefined : values.priceClassType,
        redeemCode: values.redeemCode.trim() || undefined,
        location: address?.displayText.trim() || values.locationSearchText.trim() || undefined,
        lat: address?.latitude,
        lng: address?.longitude,
        addressLine1: address?.addressLine1 || undefined,
        addressLine2: address?.addressLine2 || undefined,
        city: address?.city || undefined,
        postCode: address?.postCode || undefined,
        state: address?.state || undefined,
        country: address?.country || undefined,
        partnerId,
        firstName,
        step: step === 'details' ? undefined : step,
    };
}

export function bookingRequestPlanSearchEqual(a: BookingRequestPlanSearch, b: BookingRequestPlanSearch): boolean {
    return (
        a.occasion === b.occasion &&
        a.dateTime === b.dateTime &&
        a.minDateTime === b.minDateTime &&
        a.maxDateTime === b.maxDateTime &&
        a.adults === b.adults &&
        a.children === b.children &&
        a.message === b.message &&
        (a.preferences ?? []).join('\0') === (b.preferences ?? []).join('\0') &&
        a.redeemCode === b.redeemCode &&
        a.location === b.location &&
        a.lat === b.lat &&
        a.lng === b.lng &&
        a.addressLine1 === b.addressLine1 &&
        a.addressLine2 === b.addressLine2 &&
        a.city === b.city &&
        a.postCode === b.postCode &&
        a.state === b.state &&
        a.country === b.country &&
        a.partnerId === b.partnerId &&
        a.firstName === b.firstName &&
        a.step === b.step &&
        a.cuisine === b.cuisine &&
        a.priceClass === b.priceClass
    );
}

/** Max days for the wrap chip strip; larger or open-ended windows use DatePicker. */
const BOOKING_REQUEST_PLAN_DATE_CHIP_MAX = 14;

/**
 * Days for the chip strip when both bounds are set.
 * Returns `[]` when the window is open-ended (caller should use DatePicker).
 */
export function bookingRequestPlanSelectableDays(bounds: BookingRequestFormDateTimeBounds, now = new Date()): Date[] {
    if (!bounds.minDateTime || !bounds.maxDateTime) return [];

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const minDay = new Date(bounds.minDateTime);
    minDay.setHours(0, 0, 0, 0);
    const start = minDay.getTime() > startOfToday.getTime() ? minDay : startOfToday;

    const end = new Date(bounds.maxDateTime);
    end.setHours(0, 0, 0, 0);

    if (end.getTime() < start.getTime()) return [];

    const days: Date[] = [];
    const cursor = new Date(start);
    while (cursor.getTime() <= end.getTime() && days.length < 62) {
        days.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
    }
    return days;
}

export function bookingRequestPlanUsesDateChips(bounds: BookingRequestFormDateTimeBounds, dayCount: number): boolean {
    return bounds.minDateTime != null && bounds.maxDateTime != null && dayCount > 0 && dayCount <= BOOKING_REQUEST_PLAN_DATE_CHIP_MAX;
}

export function bookingRequestPlanChefArrivalHint(dateTime: Date, locale: 'de' | 'en'): string {
    const arrival = new Date(dateTime);
    arrival.setMinutes(arrival.getMinutes() - 90);
    const hours = String(arrival.getHours()).padStart(2, '0');
    const minutes = String(arrival.getMinutes()).padStart(2, '0');
    return {
        de: `Ankunft eures Chefs ca. ${hours}:${minutes} Uhr.`,
        en: `Your chef usually arrives around ${hours}:${minutes}.`,
    }[locale];
}

export { bookingRequestFormDateTimeBoundsFromSearch, bookingRequestFormHourOptions, bookingRequestFormMinuteOptions };
