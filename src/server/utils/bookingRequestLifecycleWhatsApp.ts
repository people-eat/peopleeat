import { eq, inArray } from 'drizzle-orm';

import { formatDate, formatTime } from '../../shared/formatDate';
import type { Locale } from '../../shared/locale';
import { bookingRequests, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { OutboundWhatsAppPurpose, OutboundWhatsAppRelatedEntityType } from '../domain/whatsapp';
import { whatsappPhoneNumberNormalize } from '../domain/whatsapp';

type WhatsAppUser = {
    userId: string;
    firstName: string;
    locale: Locale;
    timeZone: string;
    phoneNumber: string | null;
};

async function userByIdFind(serverRuntime: ServerRuntime, userId: string): Promise<WhatsAppUser | null> {
    const [row] = await serverRuntime.db
        .select({
            userId: users.userId,
            firstName: users.firstName,
            locale: users.locale,
            timeZone: users.timeZone,
            phoneNumber: users.phoneNumber,
        })
        .from(users)
        .where(inArray(users.userId, [userId]))
        .limit(1);
    return row ?? null;
}

async function bookingRequestDateTimeFind(serverRuntime: ServerRuntime, bookingRequestId: string): Promise<Date | null> {
    const [row] = await serverRuntime.db
        .select({ dateTime: bookingRequests.dateTime })
        .from(bookingRequests)
        .where(eq(bookingRequests.bookingRequestId, bookingRequestId))
        .limit(1);
    return row?.dateTime ?? null;
}

function eventDateLabel(dateTime: Date, user: WhatsAppUser): string {
    return formatDate(dateTime, { locale: user.locale, dateStyle: 'full', timeZone: user.timeZone });
}

function eventTimeLabel(dateTime: Date, user: WhatsAppUser): string {
    return formatTime(dateTime, { locale: user.locale, timeStyle: 'short', timeZone: user.timeZone });
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
    await templateSend(serverRuntime, {
        label: 'userBookingRequestCreateWhatsAppSend',
        entityId: args.bookingRequestId,
        recipientUserId: args.customerUserId,
        purpose: 'BOOKING_REQUEST_CREATED',
        relatedEntity: { type: 'BOOKING_REQUEST', id: args.bookingRequestId },
        bodyParameters: (customer) => [
            customer.firstName,
            eventDateLabel(args.dateTime, customer),
            eventTimeLabel(args.dateTime, customer),
        ],
    });
}

export async function bookingRequestCookNotifyWhatsAppSend(
    serverRuntime: ServerRuntime,
    args: { bookingRequestId: string; cookUserId: string; city: string; dateTime: Date },
): Promise<void> {
    await templateSend(serverRuntime, {
        label: 'bookingRequestCookNotifyWhatsAppSend',
        entityId: args.bookingRequestId,
        recipientUserId: args.cookUserId,
        purpose: 'BOOKING_REQUEST_COOK_NOTIFY',
        relatedEntity: { type: 'BOOKING_REQUEST', id: args.bookingRequestId },
        bodyParameters: (cook) => [cook.firstName, args.city, eventDateLabel(args.dateTime, cook)],
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
        menusLabel: string;
    },
): Promise<void> {
    await templateSend(serverRuntime, {
        label: 'cookBookingRequestOfferCreateWhatsAppSend',
        entityId: args.bookingRequestOfferId,
        recipientUserId: args.customerUserId,
        purpose: 'BOOKING_REQUEST_OFFER_CREATED',
        relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: args.bookingRequestOfferId },
        bodyParameters: (customer) => [customer.firstName, args.cookFirstName, eventDateLabel(args.dateTime, customer), args.menusLabel],
    });
}

export async function cookBookingRequestOfferSuggestedMenusUpdateWhatsAppSend(
    serverRuntime: ServerRuntime,
    args: { bookingRequestOfferId: string; bookingRequestId: string; customerUserId: string; cookFirstName: string },
): Promise<void> {
    const dateTime = await bookingRequestDateTimeFind(serverRuntime, args.bookingRequestId);
    if (!dateTime) {
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
        bodyParameters: (customer) => [customer.firstName, args.cookFirstName, eventDateLabel(dateTime, customer)],
    });
}

export async function userBookingRequestOfferAcceptWhatsAppSend(
    serverRuntime: ServerRuntime,
    args: { bookingRequestOfferId: string; bookingRequestId: string; customerUserId: string; cookFirstName: string },
): Promise<void> {
    await templateSend(serverRuntime, {
        label: 'userBookingRequestOfferAcceptWhatsAppSend',
        entityId: args.bookingRequestOfferId,
        recipientUserId: args.customerUserId,
        purpose: 'BOOKING_REQUEST_OFFER_ACCEPTED',
        relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: args.bookingRequestOfferId },
        bodyParameters: (customer) => [customer.firstName, args.cookFirstName],
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
    const dateTime = await bookingRequestDateTimeFind(serverRuntime, args.bookingRequestId);
    if (!dateTime) {
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
        bodyParameters: (cook) => [cook.firstName, args.customerFirstName, eventDateLabel(dateTime, cook)],
    });
}

export async function bookingRequestOfferPaymentConfirmedWhatsAppSend(
    serverRuntime: ServerRuntime,
    args: { bookingRequestOfferId: string; bookingRequestId: string; customerUserId: string; cookFirstName: string },
): Promise<void> {
    await templateSend(serverRuntime, {
        label: 'bookingRequestOfferPaymentConfirmedWhatsAppSend',
        entityId: args.bookingRequestOfferId,
        recipientUserId: args.customerUserId,
        purpose: 'BOOKING_REQUEST_OFFER_PAYMENT_CONFIRMED',
        relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: args.bookingRequestOfferId },
        bodyParameters: (customer) => [customer.firstName, args.cookFirstName],
    });
}

export async function bookingRequestOfferPullPaymentAnnouncementWhatsAppSend(
    serverRuntime: ServerRuntime,
    args: { bookingRequestOfferId: string; bookingRequestId: string; customerUserId: string; totalLabel: string },
): Promise<void> {
    await templateSend(serverRuntime, {
        label: 'bookingRequestOfferPullPaymentAnnouncementWhatsAppSend',
        entityId: args.bookingRequestOfferId,
        recipientUserId: args.customerUserId,
        purpose: 'BOOKING_REQUEST_OFFER_PULL_PAYMENT_ANNOUNCEMENT',
        relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: args.bookingRequestOfferId },
        bodyParameters: (customer) => [customer.firstName, args.totalLabel],
    });
}

export async function userBookingRequestCancelWhatsAppSend(
    serverRuntime: ServerRuntime,
    args: { bookingRequestId: string; customerUserId: string },
): Promise<void> {
    await templateSend(serverRuntime, {
        label: 'userBookingRequestCancelWhatsAppSend',
        entityId: args.bookingRequestId,
        recipientUserId: args.customerUserId,
        purpose: 'BOOKING_REQUEST_CANCELED',
        relatedEntity: { type: 'BOOKING_REQUEST', id: args.bookingRequestId },
        bodyParameters: (customer) => [customer.firstName],
    });
}

export async function userBookingRequestCancelCookWhatsAppSend(
    serverRuntime: ServerRuntime,
    args: { bookingRequestId: string; cookUserId: string; customerFirstName: string },
): Promise<void> {
    await templateSend(serverRuntime, {
        label: 'userBookingRequestCancelCookWhatsAppSend',
        entityId: args.bookingRequestId,
        recipientUserId: args.cookUserId,
        purpose: 'BOOKING_REQUEST_CANCELED_COOK',
        relatedEntity: { type: 'BOOKING_REQUEST', id: args.bookingRequestId },
        bodyParameters: (cook) => [cook.firstName, args.customerFirstName],
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
    const dateTime = await bookingRequestDateTimeFind(serverRuntime, args.bookingRequestId);
    if (!dateTime) return;
    await templateSend(serverRuntime, {
        label: 'userBookingRequestReactionReminderWhatsAppSend',
        entityId: args.bookingRequestId,
        recipientUserId: args.customerUserId,
        purpose: 'BOOKING_REQUEST_REACTION_REMINDER',
        relatedEntity: { type: 'BOOKING_REQUEST', id: args.bookingRequestId },
        bodyParameters: (customer) => [customer.firstName, eventDateLabel(dateTime, customer)],
    });
}
