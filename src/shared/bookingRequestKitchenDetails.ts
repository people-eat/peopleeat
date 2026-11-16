import { t } from '../i18n/t';
import type { Locale } from './locale';

export const bookingRequestKitchenDetailsAvailabilities = ['FULL', 'LIMITED', 'NONE', 'UNKNOWN'] as const;
export type BookingRequestKitchenDetailsAvailability = (typeof bookingRequestKitchenDetailsAvailabilities)[number];

export const bookingRequestKitchenDetailsSpaces = ['YES', 'LIMITED', 'NO'] as const;
export type BookingRequestKitchenDetailsSpace = (typeof bookingRequestKitchenDetailsSpaces)[number];

export const bookingRequestKitchenDetailsGuestTablewareValues = ['PROVIDED', 'COOK_BRINGS', 'MIXED'] as const;
export type BookingRequestKitchenDetailsGuestTableware = (typeof bookingRequestKitchenDetailsGuestTablewareValues)[number];

export const BOOKING_REQUEST_KITCHEN_DETAILS_PHOTO_MAX = 3;

export type BookingRequestKitchenDetailsDraft = {
    availability: BookingRequestKitchenDetailsAvailability | null;
    fridgeSpace: BookingRequestKitchenDetailsSpace | null;
    platingSpace: BookingRequestKitchenDetailsSpace | null;
    guestTableware: BookingRequestKitchenDetailsGuestTableware | null;
    notes: string;
};

export const bookingRequestKitchenDetailsDraftEmpty: BookingRequestKitchenDetailsDraft = {
    availability: null,
    fridgeSpace: null,
    platingSpace: null,
    guestTableware: null,
    notes: '',
};

export function bookingRequestKitchenDetailsAvailabilityLabel(value: BookingRequestKitchenDetailsAvailability, locale: Locale): string {
    return t(locale, 'common', `bookingRequestKitchen.availability.${value}`);
}

export function bookingRequestKitchenDetailsSpaceLabel(value: BookingRequestKitchenDetailsSpace, locale: Locale): string {
    return t(locale, 'common', `bookingRequestKitchen.space.${value}`);
}

export function bookingRequestKitchenDetailsGuestTablewareLabel(value: BookingRequestKitchenDetailsGuestTableware, locale: Locale): string {
    return t(locale, 'common', `bookingRequestKitchen.guestTableware.${value}`);
}

export function bookingRequestKitchenDetailsDraftIsEmpty(draft: BookingRequestKitchenDetailsDraft, photoCount = 0): boolean {
    if (photoCount > 0) return false;
    return (
        draft.availability == null &&
        draft.fridgeSpace == null &&
        draft.platingSpace == null &&
        draft.guestTableware == null &&
        draft.notes.trim().length === 0
    );
}
