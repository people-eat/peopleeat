/** E.164: `+` + country code (non-zero start) + subscriber number, 7–15 digits total after `+`. */
const E164_PHONE = /^\+[1-9]\d{6,14}$/;

/**
 * Normalize a contact phone to E.164 with a leading `+`, or `undefined` when invalid.
 *
 * - Strips spaces, dashes, parentheses, and other punctuation
 * - Accepts `+4915…` or bare international digits `4915…` → `+4915…`
 * - Rejects trunk/local numbers that start with `0` (e.g. German `0152…`) — country code required
 */
export function phoneNumberNormalize(phoneNumber: string | null | undefined): string | undefined {
    const trimmed = phoneNumber?.trim();
    if (!trimmed) {
        return undefined;
    }

    const hadPlus = trimmed.startsWith('+');
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length === 0) {
        return undefined;
    }

    // Local trunk prefix without a country code cannot be mapped safely.
    if (!hadPlus && digits.startsWith('0')) {
        return undefined;
    }

    const e164 = `+${digits}`;
    if (!E164_PHONE.test(e164)) {
        return undefined;
    }
    return e164;
}

/** Require a valid E.164 phone; throw with `{errorPrefix}: phoneNumber …`. */
export function phoneNumberAssert(phoneNumber: string, errorPrefix: string): string {
    const normalized = phoneNumberNormalize(phoneNumber);
    if (!normalized) {
        throw new Error(`${errorPrefix}: phoneNumber must be E.164 with country code (e.g. +4915123456789)`);
    }
    return normalized;
}

/** Digits-only form for Meta Cloud API `to` / `wa_id` (no leading `+`). */
export function phoneNumberForWhatsAppApi(e164: string): string {
    const normalized = phoneNumberNormalize(e164) ?? e164.trim();
    return normalized.startsWith('+') ? normalized.slice(1) : normalized.replace(/\D/g, '');
}
