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
    return {
        FULL: { de: 'Voll ausgestattet', en: 'Fully equipped' },
        LIMITED: { de: 'Eingeschränkt', en: 'Limited' },
        NONE: { de: 'Keine Küche', en: 'No kitchen' },
        UNKNOWN: { de: 'Unsicher', en: 'Not sure' },
    }[value][locale];
}

export function bookingRequestKitchenDetailsSpaceLabel(value: BookingRequestKitchenDetailsSpace, locale: Locale): string {
    return {
        YES: { de: 'Ja', en: 'Yes' },
        LIMITED: { de: 'Eingeschränkt', en: 'Limited' },
        NO: { de: 'Nein', en: 'No' },
    }[value][locale];
}

export function bookingRequestKitchenDetailsGuestTablewareLabel(value: BookingRequestKitchenDetailsGuestTableware, locale: Locale): string {
    return {
        PROVIDED: { de: 'Wir haben es', en: 'We have them' },
        COOK_BRINGS: { de: 'Bitte mitbringen', en: 'Please bring' },
        MIXED: { de: 'Gemischt', en: 'Mixed' },
    }[value][locale];
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
