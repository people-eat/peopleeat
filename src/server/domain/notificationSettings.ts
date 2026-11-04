import type { OutboundEmailPurpose } from './outboundEmail';
import type { OutboundWhatsAppPurpose } from './whatsapp';

const notificationDomainKeys = [
    'customerBooking',
    'customerChat',
    'customerReview',
    'cookNewRequest',
    'cookOffer',
    'cookChat',
    'cookReview',
] as const;

type NotificationDomain = (typeof notificationDomainKeys)[number];

export type NotificationAudience = 'CUSTOMER' | 'COOK';

type NotificationChannelSettings = {
    email: boolean;
    whatsApp: boolean;
};

export type UserNotificationSettings = Record<NotificationDomain, NotificationChannelSettings>;

/** Partial jsonb. A missing domain or channel means that channel is on. */
export type UserNotificationSettingsStored =
    | {
          [Domain in NotificationDomain]?: Partial<NotificationChannelSettings>;
      }
    | null;

export type UserNotificationSettingsPatch = {
    [Domain in NotificationDomain]?: NotificationChannelSettings | null;
};

export function notificationSettingsResolve(stored: UserNotificationSettingsStored | undefined): UserNotificationSettings {
    const resolved = {} as UserNotificationSettings;
    for (const domain of notificationDomainKeys) {
        const row = stored?.[domain];
        resolved[domain] = {
            email: row?.email ?? true,
            whatsApp: row?.whatsApp ?? true,
        };
    }
    return resolved;
}

export function notificationSettingsMerge(
    stored: UserNotificationSettingsStored | undefined,
    patch: UserNotificationSettingsPatch,
): UserNotificationSettings {
    const resolved = notificationSettingsResolve(stored);
    for (const domain of notificationDomainKeys) {
        const next = patch[domain];
        if (next == null) {
            continue;
        }
        if (typeof next.email !== 'boolean' || typeof next.whatsApp !== 'boolean') {
            throw new Error(`notificationSettings: ${domain} requires email and whatsApp`);
        }
        resolved[domain] = { email: next.email, whatsApp: next.whatsApp };
    }
    return resolved;
}

export function notificationSettingsPatchHasDomain(patch: UserNotificationSettingsPatch | null | undefined): boolean {
    if (patch == null) {
        return false;
    }
    return notificationDomainKeys.some((domain) => patch[domain] != null);
}

function channelAllowed(
    stored: UserNotificationSettingsStored | undefined,
    domain: NotificationDomain,
    channel: keyof NotificationChannelSettings,
): boolean {
    return notificationSettingsResolve(stored)[domain][channel];
}

function audienceDomain(
    purpose: string,
    audience: NotificationAudience | undefined,
    customer: NotificationDomain,
    cook: NotificationDomain,
): NotificationDomain {
    if (audience === 'CUSTOMER') {
        return customer;
    }
    if (audience === 'COOK') {
        return cook;
    }
    throw new Error(`notificationSettings: ${purpose} requires an audience`);
}

type NotificationDelivery = { kind: 'always' } | { kind: 'optional'; domain: NotificationDomain };

function emailDelivery(purpose: OutboundEmailPurpose, audience: NotificationAudience | undefined): NotificationDelivery {
    switch (purpose) {
        case 'GIFT_CARD_PURCHASED':
        case 'AUTH_EMAIL_OTP':
        case 'EMAIL_ADDRESS_UPDATE_CONFIRM':
        case 'ACCOUNT_DELETE_CONFIRM':
        case 'BOOKING_REQUEST_OFFER_PAYMENT_CONFIRMED':
        case 'BOOKING_REQUEST_OFFER_PAYMENT_STATEMENT':
        case 'BOOKING_REQUEST_OFFER_PULL_PAYMENT_ANNOUNCEMENT':
        case 'SUPPORT_REQUEST_CREATED':
        case 'SUPPORT_REQUEST_MESSAGE_FROM_ADMIN':
        case 'SUPPORT_REQUEST_RESOLVED':
        case 'COOK_APPROVED_BY_ADMIN':
            return { kind: 'always' };
        case 'CALL_SLOT_BOOKING_REQUEST':
        case 'CALL_SLOT_BOOKING_CONFIRM':
        case 'CALL_SLOT_BOOKING_DECLINE':
        case 'CALL_SLOT_BOOKING_CANCEL':
        case 'CALL_SLOT_BOOKING_REMINDER':
        case 'BOOKING_REQUEST_CANCELED':
        case 'BOOKING_EVENT_CALENDAR':
            return { kind: 'optional', domain: audienceDomain(purpose, audience, 'customerBooking', 'cookOffer') };
        case 'BOOKING_REQUEST_COOK_NOTIFY':
            return { kind: 'optional', domain: 'cookNewRequest' };
        case 'BOOKING_REQUEST_CREATED':
        case 'BOOKING_REQUEST_OFFER_CREATED':
        case 'BOOKING_REQUEST_OFFER_MENU_UPDATED':
        case 'BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT_ACCEPTED':
        case 'BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT_DECLINED':
            return { kind: 'optional', domain: 'customerBooking' };
        case 'BOOKING_REQUEST_UPDATED':
        case 'BOOKING_REQUEST_OFFER_ACCEPTED':
        case 'BOOKING_REQUEST_OFFER_NOT_CHOSEN':
        case 'BOOKING_REQUEST_OFFER_DECLINED':
        case 'BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT_REQUESTED':
            return { kind: 'optional', domain: 'cookOffer' };
        case 'TESTIMONIAL_MEMORY_NUDGE_CUSTOMER':
        case 'TESTIMONIAL_REMINDER_MORNING_CUSTOMER':
        case 'TESTIMONIAL_REMINDER_EVENING_CUSTOMER':
            return { kind: 'optional', domain: 'customerReview' };
        case 'TESTIMONIAL_MEMORY_NUDGE_COOK':
        case 'TESTIMONIAL_REMINDER_MORNING_COOK':
        case 'TESTIMONIAL_REMINDER_EVENING_COOK':
            return { kind: 'optional', domain: 'cookReview' };
        case 'BOOKING_REQUEST_OFFER_CHAT_MESSAGE_TO_CUSTOMER':
            return { kind: 'optional', domain: 'customerChat' };
        case 'BOOKING_REQUEST_OFFER_CHAT_MESSAGE_TO_COOK':
            return { kind: 'optional', domain: 'cookChat' };
        default: {
            const unreachable: never = purpose;
            return unreachable;
        }
    }
}

function whatsAppDelivery(purpose: OutboundWhatsAppPurpose, audience: NotificationAudience | undefined): NotificationDelivery {
    switch (purpose) {
        case 'BOOKING_REQUEST_OFFER_PAYMENT_CONFIRMED':
        case 'BOOKING_REQUEST_OFFER_PULL_PAYMENT_ANNOUNCEMENT':
        case 'CONCIERGE_SESSION_REPLY':
            return { kind: 'always' };
        case 'CALL_SLOT_BOOKING_CREATE':
        case 'CALL_SLOT_BOOKING_CONFIRM':
        case 'CALL_SLOT_BOOKING_DECLINE':
        case 'CALL_SLOT_BOOKING_CANCEL':
        case 'CALL_SLOT_BOOKING_REMINDER':
            return { kind: 'optional', domain: audienceDomain(purpose, audience, 'customerBooking', 'cookOffer') };
        case 'BOOKING_REQUEST_COOK_NOTIFY':
            return { kind: 'optional', domain: 'cookNewRequest' };
        case 'BOOKING_REQUEST_CREATED':
        case 'BOOKING_REQUEST_OFFER_CREATED':
        case 'BOOKING_REQUEST_OFFER_MENU_UPDATED':
        case 'BOOKING_REQUEST_OFFER_ACCEPTED':
        case 'BOOKING_REQUEST_CANCELED':
        case 'BOOKING_REQUEST_REACTION_REMINDER':
            return { kind: 'optional', domain: 'customerBooking' };
        case 'BOOKING_REQUEST_UPDATED_COOK':
        case 'BOOKING_REQUEST_OFFER_ACCEPTED_COOK':
        case 'BOOKING_REQUEST_CANCELED_COOK':
        case 'BOOKING_REQUEST_OFFER_MENU_CHANGES_REQUESTED_COOK':
            return { kind: 'optional', domain: 'cookOffer' };
        case 'BOOKING_REQUEST_OFFER_CHAT_UNREAD_CUSTOMER':
            return { kind: 'optional', domain: 'customerChat' };
        case 'BOOKING_REQUEST_OFFER_CHAT_UNREAD_COOK':
            return { kind: 'optional', domain: 'cookChat' };
        case 'TESTIMONIAL_MEMORY_NUDGE_CUSTOMER':
        case 'TESTIMONIAL_REMINDER_MORNING_CUSTOMER':
        case 'TESTIMONIAL_REMINDER_EVENING_CUSTOMER':
            return { kind: 'optional', domain: 'customerReview' };
        case 'TESTIMONIAL_MEMORY_NUDGE_COOK':
        case 'TESTIMONIAL_REMINDER_MORNING_COOK':
        case 'TESTIMONIAL_REMINDER_EVENING_COOK':
            return { kind: 'optional', domain: 'cookReview' };
        default: {
            const unreachable: never = purpose;
            return unreachable;
        }
    }
}

export function notificationEmailAllowed(
    stored: UserNotificationSettingsStored | undefined,
    purpose: OutboundEmailPurpose,
    audience?: NotificationAudience,
): boolean {
    const delivery = emailDelivery(purpose, audience);
    if (delivery.kind === 'always') {
        return true;
    }
    return channelAllowed(stored, delivery.domain, 'email');
}

export function notificationWhatsAppAllowed(
    stored: UserNotificationSettingsStored | undefined,
    purpose: OutboundWhatsAppPurpose,
    audience?: NotificationAudience,
): boolean {
    const delivery = whatsAppDelivery(purpose, audience);
    if (delivery.kind === 'always') {
        return true;
    }
    return channelAllowed(stored, delivery.domain, 'whatsApp');
}
