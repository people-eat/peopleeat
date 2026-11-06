import type { Locale } from './locale';

export const bookingRequestSettings = ['INDOOR', 'OUTDOOR'] as const;
export type BookingRequestSetting = (typeof bookingRequestSettings)[number];

/** UI choice on the location step. `LATER` and `null` both persist as unknown. */
export type BookingRequestSettingChoice = BookingRequestSetting | 'LATER' | null;

export function isBookingRequestSetting(value: unknown): value is BookingRequestSetting {
    return typeof value === 'string' && (bookingRequestSettings as readonly string[]).includes(value);
}

export function bookingRequestSettingChoiceParse(value: unknown): Exclude<BookingRequestSettingChoice, null> | undefined {
    if (value === 'INDOOR' || value === 'OUTDOOR' || value === 'LATER') return value;
    return undefined;
}

export function bookingRequestSettingFromChoice(choice: BookingRequestSettingChoice): BookingRequestSetting | null {
    return choice === 'INDOOR' || choice === 'OUTDOOR' ? choice : null;
}

export function bookingRequestSettingChoiceFromStored(setting: BookingRequestSetting | null | undefined): BookingRequestSettingChoice {
    return setting ?? null;
}

export function bookingRequestSettingLabel(setting: BookingRequestSetting, locale: Locale): string {
    return { INDOOR: { de: 'Drinnen', en: 'Indoor' }, OUTDOOR: { de: 'Draußen', en: 'Outdoor' } }[setting][locale];
}
