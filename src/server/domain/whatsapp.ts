import { phoneNumberForWhatsAppApi, phoneNumberNormalize } from '../../shared/phoneNumber';
import { whatsappTemplateDefinitionFind } from './whatsappTemplates';

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
    | 'CALL_SLOT_BOOKING_DECLINE'
    | 'CALL_SLOT_BOOKING_CANCEL'
    | 'CALL_SLOT_BOOKING_REMINDER'
    | 'BOOKING_REQUEST_OFFER_MENU_CHANGES_REQUESTED_COOK'
    | 'TESTIMONIAL_MEMORY_NUDGE_CUSTOMER'
    | 'TESTIMONIAL_REMINDER_MORNING_CUSTOMER'
    | 'TESTIMONIAL_REMINDER_EVENING_CUSTOMER'
    | 'TESTIMONIAL_MEMORY_NUDGE_COOK'
    | 'TESTIMONIAL_REMINDER_MORNING_COOK'
    | 'TESTIMONIAL_REMINDER_EVENING_COOK'
    | 'CONCIERGE_SESSION_REPLY';

export type OutboundWhatsAppRelatedEntityType =
    'BOOKING_REQUEST_OFFER' | 'BOOKING_REQUEST' | 'COOK_CALL_SLOT_BOOKING' | 'WHATSAPP_CONVERSATION';

export type WhatsAppMessageDirection = 'INBOUND' | 'OUTBOUND';

export type WhatsAppMessageKind = 'TEXT' | 'TEMPLATE' | 'MEDIA' | 'BUTTON_REPLY' | 'INTERACTIVE' | 'UNSUPPORTED';

/** Versioned catalog names. Meta delivery additionally requires approved Utility status. */
export const whatsappTemplateNameByPurpose: Record<Exclude<OutboundWhatsAppPurpose, 'CONCIERGE_SESSION_REPLY'>, string | null> = {
    BOOKING_REQUEST_CREATED: 'booking_request_received_customer_v2',
    BOOKING_REQUEST_COOK_NOTIFY: 'booking_request_available_cook_v1',
    BOOKING_REQUEST_UPDATED_COOK: 'booking_request_updated_cook_v1',
    BOOKING_REQUEST_OFFER_CREATED: 'menu_offer_created_customer_v1',
    BOOKING_REQUEST_OFFER_MENU_UPDATED: 'menu_offer_updated_customer_v1',
    // Email-only: customer accept confirm (cook accept still has a template below).
    BOOKING_REQUEST_OFFER_ACCEPTED: null,
    BOOKING_REQUEST_OFFER_ACCEPTED_COOK: 'menu_offer_accepted_cook_v1',
    // Email-only after payment (cost).
    BOOKING_REQUEST_OFFER_PAYMENT_CONFIRMED: null,
    BOOKING_REQUEST_OFFER_PULL_PAYMENT_ANNOUNCEMENT: null,
    // Email-only closures (cost).
    BOOKING_REQUEST_CANCELED: null,
    BOOKING_REQUEST_CANCELED_COOK: null,
    // Cook wrote → notify customer.
    BOOKING_REQUEST_OFFER_CHAT_UNREAD_CUSTOMER: 'offer_chat_message_received_customer_v1',
    // Customer wrote → notify cook.
    BOOKING_REQUEST_OFFER_CHAT_UNREAD_COOK: 'offer_chat_message_received_cook_v1',
    BOOKING_REQUEST_REACTION_REMINDER: 'booking_request_feedback_requested_customer_v1',
    CALL_SLOT_BOOKING_CREATE: 'video_call_requested_participant_v1',
    CALL_SLOT_BOOKING_CONFIRM: 'video_call_confirmed_participant_v1',
    CALL_SLOT_BOOKING_DECLINE: 'video_call_declined_participant_v1',
    CALL_SLOT_BOOKING_CANCEL: 'video_call_canceled_participant_v1',
    CALL_SLOT_BOOKING_REMINDER: 'video_call_reminder_participant_v1',
    BOOKING_REQUEST_OFFER_MENU_CHANGES_REQUESTED_COOK: 'menu_offer_changes_requested_cook_v1',
    TESTIMONIAL_MEMORY_NUDGE_CUSTOMER: 'booking_review_memory_customer_v1',
    TESTIMONIAL_REMINDER_MORNING_CUSTOMER: 'booking_review_morning_customer_v1',
    TESTIMONIAL_REMINDER_EVENING_CUSTOMER: 'booking_review_evening_customer_v1',
    TESTIMONIAL_MEMORY_NUDGE_COOK: 'booking_review_memory_cook_v1',
    TESTIMONIAL_REMINDER_MORNING_COOK: 'booking_review_morning_cook_v1',
    TESTIMONIAL_REMINDER_EVENING_COOK: 'booking_review_evening_cook_v1',
};

const reactionReminderTemplate = whatsappTemplateDefinitionFind(whatsappTemplateNameByPurpose.BOOKING_REQUEST_REACTION_REMINDER!);

/** Historical labels remain valid because recipients can still answer older messages. */
export const WHATSAPP_BOOKING_REQUEST_REACTION_LABELS = new Set([
    ...(['de', 'en'] as const).flatMap((locale) => reactionReminderTemplate[locale].quickReplies ?? []),
    'Ich hatte ein niedrigeres Budget erwartet',
    'Ich hatte andere Menüs erwartet',
    'Ich habe die Angebote noch nicht gesehen',
    'Ich brauche noch etwas Zeit',
    'Ich habe kein Interesse mehr',
    'Angebote noch nicht gesehen',
    'Niedrigeres Budget erwartet',
    'Andere Menüs erwartet',
]);

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
