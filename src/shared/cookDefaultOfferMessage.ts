import { bookingRequestSuggestedOfferMessage } from './bookingRequestSuggestedOfferMessage';
import { containsPhoneNumber } from './containsPhoneNumber';
import type { Locale } from './locale';
import { textNormalizeProse } from './textNormalize';

export const COOK_DEFAULT_OFFER_MESSAGE_MAX_LENGTH = 2000;

export type CookDefaultOfferMessageMode = 'template' | 'empty' | 'custom';

export function cookDefaultOfferMessageModeFrom(value: string | null): CookDefaultOfferMessageMode {
    if (value == null) return 'template';
    if (value.length === 0) return 'empty';
    return 'custom';
}

export function cookDefaultOfferMessageFormFrom(value: string | null): {
    defaultOfferMessageMode: CookDefaultOfferMessageMode;
    defaultOfferMessageText: string;
} {
    const mode = cookDefaultOfferMessageModeFrom(value);
    return {
        defaultOfferMessageMode: mode,
        defaultOfferMessageText: mode === 'custom' ? (value ?? '') : '',
    };
}

/** `undefined` means omit from `CookUpdate` so a `null` column stays `null`. */
export function cookDefaultOfferMessageUpdateFrom({
    current,
    mode,
    text,
}: {
    current: string | null;
    mode: CookDefaultOfferMessageMode;
    text: string;
}): string | undefined {
    if (mode === 'template') return undefined;
    const next = mode === 'empty' ? '' : text;
    if (current === next) return undefined;
    return next;
}

export function cookSuggestedOfferMessageResolve(defaultOfferMessage: string | null, customerLocale: Locale): string {
    return defaultOfferMessage ?? bookingRequestSuggestedOfferMessage(customerLocale);
}

export function cookDefaultOfferMessageNormalize(value: string, errorPrefix: string): string {
    const normalized = textNormalizeProse(value);
    if (normalized.length > COOK_DEFAULT_OFFER_MESSAGE_MAX_LENGTH) {
        throw new Error(`${errorPrefix}: defaultOfferMessage is too long`);
    }
    if (normalized.length > 0 && containsPhoneNumber(normalized)) {
        throw new Error(`${errorPrefix}: defaultOfferMessage must not contain a phone number`);
    }
    return normalized;
}
