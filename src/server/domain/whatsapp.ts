import type { Locale } from '../../shared/locale';
import { phoneNumberForWhatsAppApi, phoneNumberNormalize } from '../../shared/phoneNumber';

export type OutboundWhatsAppProvider = 'meta' | 'console';

export type OutboundWhatsAppPurpose =
    | 'BOOKING_REQUEST_CREATED'
    | 'BOOKING_REQUEST_COOK_NOTIFY'
    | 'BOOKING_REQUEST_UPDATED_COOK'
    | 'BOOKING_REQUEST_OFFER_CREATED'
    | 'BOOKING_REQUEST_OFFER_MENU_UPDATED'
    | 'BOOKING_REQUEST_OFFER_ACCEPTED'
    | 'BOOKING_REQUEST_OFFER_ACCEPTED_COOK'
    | 'BOOKING_REQUEST_OFFER_PAYMENT_CONFIRMED'
    | 'BOOKING_REQUEST_OFFER_PULL_PAYMENT_ANNOUNCEMENT'
    | 'BOOKING_REQUEST_CANCELED'
    | 'BOOKING_REQUEST_CANCELED_COOK'
    | 'BOOKING_REQUEST_OFFER_CHAT_UNREAD_CUSTOMER'
    | 'BOOKING_REQUEST_OFFER_CHAT_UNREAD_COOK'
    | 'BOOKING_REQUEST_REACTION_REMINDER'
    | 'CALL_SLOT_BOOKING_CREATE'
    | 'CALL_SLOT_BOOKING_CONFIRM'
    | 'CALL_SLOT_BOOKING_CANCEL'
    | 'CALL_SLOT_BOOKING_REMINDER'
    | 'CONCIERGE_SESSION_REPLY';

export type OutboundWhatsAppRelatedEntityType =
    'BOOKING_REQUEST_OFFER' | 'BOOKING_REQUEST' | 'COOK_CALL_SLOT_BOOKING' | 'WHATSAPP_CONVERSATION';

export type WhatsAppMessageDirection = 'INBOUND' | 'OUTBOUND';

export type WhatsAppMessageKind = 'TEXT' | 'TEMPLATE' | 'MEDIA' | 'BUTTON_REPLY' | 'INTERACTIVE' | 'UNSUPPORTED';

/**
 * Meta Cloud API template name per purpose.
 * Names must match templates already approved in WhatsApp Manager.
 * `null` = email-only on purpose (post-payment / selected closures; Meta sends cost money) —
 * outbound skips WhatsApp; email still goes. See docs/features/whatsapp.md.
 */
export const whatsappTemplateNameByPurpose: Record<Exclude<OutboundWhatsAppPurpose, 'CONCIERGE_SESSION_REPLY'>, string | null> = {
    BOOKING_REQUEST_CREATED: 'user_booking_request_create__for_user',
    BOOKING_REQUEST_COOK_NOTIFY: 'user_booking_request_create__for_cook',
    BOOKING_REQUEST_UPDATED_COOK: 'user_booking_request_update__for_cook',
    BOOKING_REQUEST_OFFER_CREATED: 'cook_booking_request_offer_create__for_user',
    BOOKING_REQUEST_OFFER_MENU_UPDATED: 'cook_menu_courses_update_with_relation_to_offer__for_user',
    // Email-only: customer accept confirm (cook accept still has a template below).
    BOOKING_REQUEST_OFFER_ACCEPTED: null,
    BOOKING_REQUEST_OFFER_ACCEPTED_COOK: 'user_booking_request_offer_accept__for_cook',
    // Email-only after payment (cost).
    BOOKING_REQUEST_OFFER_PAYMENT_CONFIRMED: null,
    BOOKING_REQUEST_OFFER_PULL_PAYMENT_ANNOUNCEMENT: null,
    // Email-only closures (cost).
    BOOKING_REQUEST_CANCELED: null,
    BOOKING_REQUEST_CANCELED_COOK: null,
    // Cook wrote → notify customer.
    BOOKING_REQUEST_OFFER_CHAT_UNREAD_CUSTOMER: 'cook_booking_request_offer_unread_notifications',
    // Customer wrote → notify cook.
    BOOKING_REQUEST_OFFER_CHAT_UNREAD_COOK: 'user_booking_request_offer_unread_notifications',
    BOOKING_REQUEST_REACTION_REMINDER: 'user_booking_request_reaction_reminder',
    CALL_SLOT_BOOKING_CREATE: 'call_slot_booking_create',
    CALL_SLOT_BOOKING_CONFIRM: 'call_slot_booking_confirm',
    CALL_SLOT_BOOKING_CANCEL: 'call_slot_booking_cancel',
    CALL_SLOT_BOOKING_REMINDER: 'call_slot_booking_reminder_60_min_before',
};

/** Quick-reply labels for the DE reaction-reminder Meta template. */
export const WHATSAPP_BOOKING_REQUEST_REACTION_LABELS = new Set([
    'Ich hatte ein niedrigeres Budget erwartet',
    'Ich hatte andere Menüs erwartet',
    'Ich habe die Angebote noch nicht gesehen',
    'Ich brauche noch etwas Zeit',
    'Ich habe kein Interesse mehr',
]);

/** Meta template language codes for our locales. */
export function whatsappTemplateLanguageCode(locale: Locale): string {
    return locale === 'en' ? 'en' : 'de';
}

/** Customer-service window length after an inbound message (Meta). */
export const WHATSAPP_CUSTOMER_SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Normalize to E.164 with `+`, or undefined when invalid (shared phone rules). */
export function whatsappPhoneNumberNormalize(phoneNumber: string | null | undefined): string | undefined {
    return phoneNumberNormalize(phoneNumber);
}

/** Meta `to` / `wa_id` / migrated `contactReference` are digits without a leading `+`. */
export function whatsappPhoneNumberForMetaApi(e164: string): string {
    return phoneNumberForWhatsAppApi(e164);
}

/**
 * Candidate `Users.phoneNumber` values for a WhatsApp conversation phone.
 * Users store E.164 with `+`; Meta / migrated inbox phones often omit it.
 */
export function whatsappPhoneNumberUserMatchValues(phoneNumber: string): string[] {
    const normalized = phoneNumberNormalize(phoneNumber);
    if (normalized) {
        return [normalized, phoneNumberForWhatsAppApi(normalized)];
    }
    const trimmed = phoneNumber.trim();
    if (!trimmed) return [];
    const digits = trimmed.replace(/\D/g, '');
    if (!digits) return [];
    return [...new Set([trimmed, digits, `+${digits}`])];
}

export function whatsappMimeTypeExtension(mimeType: string): string {
    // Vendor MIME subtypes (Office Open XML etc.) are not dictionary words.
    /* cspell:disable */
    const mimeToExt: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'video/mp4': 'mp4',
        'video/3gpp': '3gp',
        'audio/aac': 'aac',
        'audio/mp4': 'm4a',
        'audio/amr': 'amr',
        'audio/ogg': 'ogg',
        'application/pdf': 'pdf',
        'application/vnd.ms-powerpoint': 'ppt',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'application/vnd.ms-excel': 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    };
    /* cspell:enable */
    return mimeToExt[mimeType.toLowerCase()] ?? 'bin';
}
