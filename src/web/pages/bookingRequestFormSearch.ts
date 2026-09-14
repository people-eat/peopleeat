import { bookingRequestPriceClassTypes, defaultBookingRequestDateTime } from '../../shared/bookingRequestFormDefaults';
import type { BookingRequestFormPriceClassType } from '../../shared/bookingRequestFormDefaults';
import type { GqlCUserBookingRequestExactEventAddressInput } from '../graphql/generated';

const BASE_CONTENT_STEPS = ['occasion', 'participants', 'location', 'dateTime', 'priceClass', 'preferences', 'message'] as const;
const ALL_CONTENT_STEPS = [
    'occasion',
    'participants',
    'location',
    'dateTime',
    'priceClass',
    'preferences',
    'restrictions',
    'message',
] as const;
type BookingRequestFormContentStep = (typeof ALL_CONTENT_STEPS)[number];
export type BookingRequestFormStep = BookingRequestFormContentStep | 'auth';

export function bookingRequestFormContentSteps(restrictionsEnabled: boolean): readonly BookingRequestFormContentStep[] {
    if (!restrictionsEnabled) return BASE_CONTENT_STEPS;
    return ALL_CONTENT_STEPS;
}
export type BookingRequestFormSearch = {
    occasion?: string;
    dateTime?: string;
    adults?: number;
    children?: number;
    message?: string;
    preferences?: string[];
    priceClass?: BookingRequestFormPriceClassType;
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
    step?: BookingRequestFormStep;
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

function isPriceClass(value: unknown): value is BookingRequestFormPriceClassType {
    return typeof value === 'string' && (bookingRequestPriceClassTypes as readonly string[]).includes(value);
}

function isFormStep(value: unknown): value is BookingRequestFormStep {
    return typeof value === 'string' && ([...ALL_CONTENT_STEPS, 'auth'] as readonly string[]).includes(value);
}

export function parseBookingRequestFormSearch(search: Record<string, unknown>): BookingRequestFormSearch {
    const occasion = typeof search.occasion === 'string' && search.occasion.trim().length > 0 ? search.occasion.trim() : undefined;
    const dateTime = typeof search.dateTime === 'string' && search.dateTime.trim().length > 0 ? search.dateTime.trim() : undefined;
    const adultsRaw = search.adults ?? search.adultCount;
    const childrenRaw = search.children ?? search.discountedCount;
    const adults = adultsRaw == null ? undefined : Math.max(1, parsePositiveInt(adultsRaw, 4));
    const children = childrenRaw == null ? undefined : parsePositiveInt(childrenRaw, 0);
    const message = typeof search.message === 'string' && search.message.trim().length > 0 ? search.message : undefined;
    const preferences = parsePreferences(search.preferences);
    const priceClass = isPriceClass(search.priceClass) ? search.priceClass : undefined;
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
    const step = isFormStep(search.step) ? search.step : undefined;

    return {
        occasion,
        dateTime,
        adults,
        children,
        message,
        preferences,
        priceClass,
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
        step,
    };
}

export function bookingRequestFormExactAddressFromSearch(
    search: BookingRequestFormSearch,
): GqlCUserBookingRequestExactEventAddressInput | null {
    if (
        search.lat == null ||
        search.lng == null ||
        search.city == null ||
        search.city.trim().length === 0 ||
        (search.location == null && search.addressLine1 == null)
    ) {
        return null;
    }
    const displayText = (search.location ?? search.addressLine1 ?? '').trim();
    if (displayText.length === 0) return null;
    return {
        displayText,
        latitude: search.lat,
        longitude: search.lng,
        addressLine1: (search.addressLine1 ?? '').trim(),
        addressLine2: (search.addressLine2 ?? '').trim(),
        city: search.city.trim(),
        postCode: (search.postCode ?? '').trim(),
        state: (search.state ?? '').trim(),
        country: (search.country ?? '').trim(),
    };
}

export function bookingRequestFormValuesFromSearch(search: BookingRequestFormSearch) {
    const exactEventAddress = bookingRequestFormExactAddressFromSearch(search);
    const parsedDate = search.dateTime ? new Date(search.dateTime) : null;
    const dateTime = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : defaultBookingRequestDateTime();

    return {
        occasion: search.occasion ?? '',
        adultCount: search.adults ?? 4,
        discountedCount: search.children ?? 0,
        locationSearchText: exactEventAddress?.displayText ?? search.location ?? '',
        exactEventAddress,
        dateTime,
        priceClassType: search.priceClass ?? null,
        preferences: search.preferences ?? [],
        originalMessage: search.message ?? '',
        redeemCode: search.redeemCode ?? '',
    };
}

export function bookingRequestFormSearchFromValues(input: {
    values: {
        occasion: string;
        adultCount: number;
        discountedCount: number;
        locationSearchText: string;
        exactEventAddress: GqlCUserBookingRequestExactEventAddressInput | null;
        dateTime: Date;
        priceClassType: BookingRequestFormPriceClassType | null;
        preferences: string[];
        originalMessage: string;
        redeemCode: string;
    };
    step: BookingRequestFormStep;
}): BookingRequestFormSearch {
    const { values, step } = input;
    const address = values.exactEventAddress;
    return {
        occasion: values.occasion.trim() || undefined,
        dateTime: values.dateTime.toISOString(),
        adults: values.adultCount,
        children: values.discountedCount > 0 ? values.discountedCount : undefined,
        message: values.originalMessage.trim() || undefined,
        preferences: values.preferences.length > 0 ? values.preferences : undefined,
        priceClass: values.priceClassType ?? undefined,
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
        step: step === 'occasion' ? undefined : step,
    };
}

function preferenceKey(preferences: string[] | undefined): string {
    return (preferences ?? []).join('\0');
}

/** True when two search snapshots would produce the same URL / seed. */
export function bookingRequestFormSearchEqual(a: BookingRequestFormSearch, b: BookingRequestFormSearch): boolean {
    return (
        a.occasion === b.occasion &&
        a.dateTime === b.dateTime &&
        a.adults === b.adults &&
        a.children === b.children &&
        a.message === b.message &&
        preferenceKey(a.preferences) === preferenceKey(b.preferences) &&
        a.priceClass === b.priceClass &&
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
        a.step === b.step
    );
}
