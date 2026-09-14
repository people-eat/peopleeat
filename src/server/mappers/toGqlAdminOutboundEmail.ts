import type { OutboundEmail } from '../db/schema';
import type { GqlSAdminOutboundEmail } from '../graphql/generated';

const PURPOSES = new Set<string>([
    'GIFT_CARD_PURCHASED',
    'AUTH_EMAIL_OTP',
    'EMAIL_ADDRESS_UPDATE_CONFIRM',
    'CALL_SLOT_BOOKING_REQUEST',
    'CALL_SLOT_BOOKING_CONFIRM',
    'CALL_SLOT_BOOKING_DECLINE',
    'CALL_SLOT_BOOKING_CANCEL',
    'CALL_SLOT_BOOKING_REMINDER',
    'BOOKING_REQUEST_COOK_NOTIFY',
    'BOOKING_REQUEST_CREATED',
    'BOOKING_REQUEST_UPDATED',
    'BOOKING_REQUEST_CANCELED',
    'BOOKING_REQUEST_OFFER_CREATED',
    'BOOKING_REQUEST_OFFER_MENU_UPDATED',
    'BOOKING_REQUEST_OFFER_ACCEPTED',
    'BOOKING_REQUEST_OFFER_NOT_CHOSEN',
    'BOOKING_REQUEST_OFFER_DECLINED',
    'BOOKING_REQUEST_OFFER_PAYMENT_CONFIRMED',
    'BOOKING_REQUEST_OFFER_PULL_PAYMENT_ANNOUNCEMENT',
    'TESTIMONIAL_MEMORY_NUDGE_CUSTOMER',
    'TESTIMONIAL_MEMORY_NUDGE_COOK',
    'TESTIMONIAL_REMINDER_MORNING_CUSTOMER',
    'TESTIMONIAL_REMINDER_MORNING_COOK',
    'TESTIMONIAL_REMINDER_EVENING_CUSTOMER',
    'TESTIMONIAL_REMINDER_EVENING_COOK',
    'SUPPORT_REQUEST_CREATED',
    'SUPPORT_REQUEST_MESSAGE_FROM_ADMIN',
    'SUPPORT_REQUEST_RESOLVED',
    'BOOKING_REQUEST_OFFER_CHAT_MESSAGE_TO_CUSTOMER',
    'BOOKING_REQUEST_OFFER_CHAT_MESSAGE_TO_COOK',
    'COOK_APPROVED_BY_ADMIN',
]);
const PROVIDERS = new Set<string>(['resend', 'console']);
const RELATED_TYPES = new Set<string>([
    'GIFT_CARD',
    'COOK_CALL_SLOT_BOOKING',
    'BOOKING_REQUEST_OFFER',
    'BOOKING_REQUEST',
    'SUPPORT_REQUEST',
    'COOK',
]);

export function toGqlAdminOutboundEmail(row: OutboundEmail): GqlSAdminOutboundEmail {
    if (!PURPOSES.has(row.purpose)) {
        throw new Error(`toGqlAdminOutboundEmail: unexpected purpose ${row.purpose}`);
    }
    if (!PROVIDERS.has(row.provider)) {
        throw new Error(`toGqlAdminOutboundEmail: unexpected provider ${row.provider}`);
    }
    if (row.relatedEntityType != null && !RELATED_TYPES.has(row.relatedEntityType)) {
        throw new Error(`toGqlAdminOutboundEmail: unexpected relatedEntityType ${row.relatedEntityType}`);
    }

    return {
        outboundEmailId: row.outboundEmailId,
        provider: row.provider,
        providerMessageId: row.providerMessageId,
        purpose: row.purpose,
        relatedEntityType: row.relatedEntityType ?? null,
        relatedEntityId: row.relatedEntityId,
        userId: row.userId,
        toEmail: row.toEmail,
        fromEmail: row.fromEmail,
        subject: row.subject,
        locale: row.locale,
        failureReason: row.failureReason,
        // Overridden by `AdminOutboundEmail.attachments` field resolver.
        attachments: [],
        createdAt: row.createdAt,
        sentAt: row.sentAt,
        failedAt: row.failedAt,
        deliveredAt: row.deliveredAt,
        deliveryDelayedAt: row.deliveryDelayedAt,
        openedAt: row.openedAt,
        clickedAt: row.clickedAt,
        bouncedAt: row.bouncedAt,
        complainedAt: row.complainedAt,
    };
}
