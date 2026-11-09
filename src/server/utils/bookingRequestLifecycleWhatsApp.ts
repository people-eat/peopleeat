import { eq, inArray } from 'drizzle-orm';

import {
    formatBookingEventDate,
    formatBookingEventTime,
    formatBookingEventWhenFromCountry,
    formatBookingWhenJoined,
} from '../../shared/formatBookingWhen';
import type { Locale } from '../../shared/locale';
import { formatTimeZonePlaceLabel, timeZoneFromCountry } from '../../shared/timeZone';
import { bookingRequests, users } from '../db/schema';
import { notificationWhatsAppAllowed } from '../domain/notificationSettings';
import type { UserNotificationSettingsStored } from '../domain/notificationSettings';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { OutboundWhatsAppPurpose, OutboundWhatsAppRelatedEntityType } from '../domain/whatsapp';
import { whatsappPhoneNumberNormalize } from '../domain/whatsapp';

type WhatsAppUser = {
    userId: string;
    firstName: string;
    locale: Locale;
    timeZone: string;
    phoneNumber: string | null;
    notificationSettings: UserNotificationSettingsStored;
};

async function userByIdFind(serverRuntime: ServerRuntime, userId: string): Promise<WhatsAppUser | null> {
    const [row] = await serverRuntime.db
        .select({
            userId: users.userId,
            firstName: users.firstName,
            locale: users.locale,
            timeZone: users.timeZone,
            phoneNumber: users.phoneNumber,
            notificationSettings: users.notificationSettings,
        })
        .from(users)
        .where(inArray(users.userId, [userId]))
        .limit(1);
    return row ?? null;
}

type BookingRequestEvent = {
    dateTime: Date;
    country: string;
    city: string;
};

async function bookingRequestEventFind(serverRuntime: ServerRuntime, bookingRequestId: string): Promise<BookingRequestEvent | null> {
    const [row] = await serverRuntime.db
        .select({ dateTime: bookingRequests.dateTime, exactEventAddress: bookingRequests.exactEventAddress })
        .from(bookingRequests)
        .where(eq(bookingRequests.bookingRequestId, bookingRequestId))
        .limit(1);
    if (!row) return null;
    return { dateTime: row.dateTime, country: row.exactEventAddress.country, city: row.exactEventAddress.city };
}

function eventDateLabel(event: BookingRequestEvent, user: WhatsAppUser): string {
    return formatBookingEventDate({
        instant: event.dateTime,
        locale: user.locale,
        venueTimeZone: timeZoneFromCountry(event.country),
        dateStyle: 'full',
    });
}

function eventTimeLabel(event: BookingRequestEvent, user: WhatsAppUser): string {
    const venueTimeZone = timeZoneFromCountry(event.country);
    const formatted = formatBookingEventWhenFromCountry({
        instant: event.dateTime,
        locale: user.locale,
        viewerTimeZone: user.timeZone,
        venueCountry: event.country,
        venueCity: event.city,
    });
    const time = formatBookingEventTime({ instant: event.dateTime, locale: user.locale, venueTimeZone });
    if (formatted.secondary == null) return time;
    const place = event.city.trim() || formatTimeZonePlaceLabel(venueTimeZone);
    return formatBookingWhenJoined({
        primary: place.length > 0 ? `${time} in ${place}` : time,
        secondary: formatted.secondary,
    });
}

async function sendSafely(serverRuntime: ServerRuntime, label: string, entityId: string, send: () => Promise<unknown>): Promise<void> {
    try {
        await send();
    } catch (error) {
        serverRuntime.log.error(
            error instanceof Error ? new Error(`${label}: WhatsApp failed for ${entityId}: ${error.message}`, { cause: error }) : error,
            null,
        );
    }
}

async function templateSend(
    serverRuntime: ServerRuntime,
    args: {
        label: string;
        entityId: string;
        recipientUserId: string;
        purpose: Exclude<OutboundWhatsAppPurpose, 'CONCIERGE_SESSION_REPLY'>;
        relatedEntity: { type: OutboundWhatsAppRelatedEntityType; id: string };
        bodyParameters: (user: WhatsAppUser) => string[];
    },
): Promise<void> {
    const recipient = await userByIdFind(serverRuntime, args.recipientUserId);
    if (!recipient) {
        serverRuntime.log.info(`${args.label}: skip WhatsApp for ${args.entityId} (recipient user ${args.recipientUserId} not found)`);
        return;
    }
    if (!notificationWhatsAppAllowed(recipient.notificationSettings, args.purpose)) {
        serverRuntime.log.info(`${args.label}: skip WhatsApp for ${args.entityId} (notification settings)`);
        return;
    }
    const toPhoneNumber = whatsappPhoneNumberNormalize(recipient.phoneNumber);
    if (!toPhoneNumber) {
        serverRuntime.log.info(
            `${args.label}: skip WhatsApp for ${args.entityId} (user ${recipient.userId} phone missing or not E.164 with country code; raw=${JSON.stringify(recipient.phoneNumber)})`,
        );
        return;
    }

    await sendSafely(serverRuntime, args.label, args.entityId, () =>
        serverRuntime.whatsapp.sendTemplate({
            purpose: args.purpose,
            toPhoneNumber,
            locale: recipient.locale,
            bodyParameters: args.bodyParameters(recipient),
            userId: recipient.userId,
            relatedEntity: args.relatedEntity,
        }),
    );
}

export async function userBookingRequestCreateWhatsAppSend(
    serverRuntime: ServerRuntime,
    args: { bookingRequestId: string; customerUserId: string; dateTime: Date },
): Promise<void> {
    const event = (await bookingRequestEventFind(serverRuntime, args.bookingRequestId)) ?? {
        dateTime: args.dateTime,
        country: '',
        city: '',
    };
    await templateSend(serverRuntime, {
        label: 'userBookingRequestCreateWhatsAppSend',
        entityId: args.bookingRequestId,
        recipientUserId: args.customerUserId,
        purpose: 'BOOKING_REQUEST_CREATED',
        relatedEntity: { type: 'BOOKING_REQUEST', id: args.bookingRequestId },
        bodyParameters: (customer) => [customer.firstName, eventDateLabel(event, customer), eventTimeLabel(event, customer)],
    });
}

export async function bookingRequestCookNotifyWhatsAppSend(
    serverRuntime: ServerRuntime,
    args: { bookingRequestId: string; cookUserId: string; city: string; country?: string | null; dateTime: Date },
): Promise<void> {
    await templateSend(serverRuntime, {
        label: 'bookingRequestCookNotifyWhatsAppSend',
        entityId: args.bookingRequestId,
        recipientUserId: args.cookUserId,
        purpose: 'BOOKING_REQUEST_COOK_NOTIFY',
        relatedEntity: { type: 'BOOKING_REQUEST', id: args.bookingRequestId },
        bodyParameters: (cook) => [
            cook.firstName,
            args.city,
            eventDateLabel({ dateTime: args.dateTime, country: args.country ?? '', city: args.city }, cook),
        ],
    });
}

export async function userBookingRequestUpdateCookWhatsAppSend(
    serverRuntime: ServerRuntime,
    args: { bookingRequestId: string; cookUserId: string; customerFirstName: string; bookingRequestOfferId: string },
): Promise<void> {
    await templateSend(serverRuntime, {
        label: 'userBookingRequestUpdateCookWhatsAppSend',
        entityId: args.bookingRequestOfferId,
        recipientUserId: args.cookUserId,
        purpose: 'BOOKING_REQUEST_UPDATED_COOK',
        relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: args.bookingRequestOfferId },
        bodyParameters: (cook) => [cook.firstName, args.customerFirstName],
    });
}

export async function cookBookingRequestOfferCreateWhatsAppSend(
    serverRuntime: ServerRuntime,
    args: {
        bookingRequestOfferId: string;
        bookingRequestId: string;
        customerUserId: string;
        cookFirstName: string;
        dateTime: Date;
        venueCountry?: string | null;
        menusLabel: string;
    },
): Promise<void> {
    await templateSend(serverRuntime, {
        label: 'cookBookingRequestOfferCreateWhatsAppSend',
        entityId: args.bookingRequestOfferId,
        recipientUserId: args.customerUserId,
        purpose: 'BOOKING_REQUEST_OFFER_CREATED',
        relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: args.bookingRequestOfferId },
        bodyParameters: (customer) => [
            customer.firstName,
            args.cookFirstName,
            eventDateLabel({ dateTime: args.dateTime, country: args.venueCountry ?? '', city: '' }, customer),
            args.menusLabel,
        ],
    });
}

export async function cookBookingRequestOfferSuggestedMenusUpdateWhatsAppSend(
    serverRuntime: ServerRuntime,
    args: { bookingRequestOfferId: string; bookingRequestId: string; customerUserId: string; cookFirstName: string },
): Promise<void> {
    const event = await bookingRequestEventFind(serverRuntime, args.bookingRequestId);
    if (!event) {
        serverRuntime.log.info(
            `cookBookingRequestOfferSuggestedMenusUpdateWhatsAppSend: skip ${args.bookingRequestOfferId} (booking request not found)`,
        );
        return;
    }

    await templateSend(serverRuntime, {
        label: 'cookBookingRequestOfferSuggestedMenusUpdateWhatsAppSend',
        entityId: args.bookingRequestOfferId,
        recipientUserId: args.customerUserId,
        purpose: 'BOOKING_REQUEST_OFFER_MENU_UPDATED',
        relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: args.bookingRequestOfferId },
        bodyParameters: (customer) => [customer.firstName, args.cookFirstName, eventDateLabel(event, customer)],
    });
}

export async function userBookingRequestOfferAcceptCookWhatsAppSend(
    serverRuntime: ServerRuntime,
    args: {
        bookingRequestOfferId: string;
        bookingRequestId: string;
        cookUserId: string;
        customerFirstName: string;
    },
): Promise<void> {
    const event = await bookingRequestEventFind(serverRuntime, args.bookingRequestId);
    if (!event) {
        serverRuntime.log.info(
            `userBookingRequestOfferAcceptCookWhatsAppSend: skip ${args.bookingRequestOfferId} (booking request not found)`,
        );
        return;
    }

    await templateSend(serverRuntime, {
        label: 'userBookingRequestOfferAcceptCookWhatsAppSend',
        entityId: args.bookingRequestOfferId,
        recipientUserId: args.cookUserId,
        purpose: 'BOOKING_REQUEST_OFFER_ACCEPTED_COOK',
        relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: args.bookingRequestOfferId },
        bodyParameters: (cook) => [cook.firstName, args.customerFirstName, eventDateLabel(event, cook)],
    });
}

export async function bookingRequestOfferChatUnreadCustomerWhatsAppSend(
    serverRuntime: ServerRuntime,
    args: { bookingRequestOfferId: string; bookingRequestId: string; customerUserId: string; cookFirstName: string },
): Promise<void> {
    await templateSend(serverRuntime, {
        label: 'bookingRequestOfferChatUnreadCustomerWhatsAppSend',
        entityId: args.bookingRequestOfferId,
        recipientUserId: args.customerUserId,
        purpose: 'BOOKING_REQUEST_OFFER_CHAT_UNREAD_CUSTOMER',
        relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: args.bookingRequestOfferId },
        bodyParameters: (customer) => [customer.firstName, args.cookFirstName],
    });
}

export async function bookingRequestOfferChatUnreadCookWhatsAppSend(
    serverRuntime: ServerRuntime,
    args: { bookingRequestOfferId: string; bookingRequestId: string; cookUserId: string; customerFirstName: string },
): Promise<void> {
    await templateSend(serverRuntime, {
        label: 'bookingRequestOfferChatUnreadCookWhatsAppSend',
        entityId: args.bookingRequestOfferId,
        recipientUserId: args.cookUserId,
        purpose: 'BOOKING_REQUEST_OFFER_CHAT_UNREAD_COOK',
        relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: args.bookingRequestOfferId },
        bodyParameters: (cook) => [cook.firstName, args.customerFirstName],
    });
}

export async function userBookingRequestReactionReminderWhatsAppSend(
    serverRuntime: ServerRuntime,
    args: { bookingRequestId: string; customerUserId: string },
): Promise<void> {
    const event = await bookingRequestEventFind(serverRuntime, args.bookingRequestId);
    if (!event) return;
    await templateSend(serverRuntime, {
        label: 'userBookingRequestReactionReminderWhatsAppSend',
        entityId: args.bookingRequestId,
        recipientUserId: args.customerUserId,
        purpose: 'BOOKING_REQUEST_REACTION_REMINDER',
        relatedEntity: { type: 'BOOKING_REQUEST', id: args.bookingRequestId },
        bodyParameters: (customer) => [customer.firstName, eventDateLabel(event, customer)],
    });
}
