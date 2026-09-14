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
        bodySnapshot: (user: WhatsAppUser) => string;
        buttonUrlParameter?: string;
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
            bodySnapshot: args.bodySnapshot(recipient),
            buttonUrlParameter: args.buttonUrlParameter,
            userId: recipient.userId,
            relatedEntity: args.relatedEntity,
        }),
    );
}

/** Meta: `user_booking_request_create__for_user` — body [userName, dateLabel, timeLabel], button bookingRequestId. */
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
        buttonUrlParameter: args.bookingRequestId,
        bodyParameters: (customer) => [
            customer.firstName,
            eventDateLabel(args.dateTime, customer),
            eventTimeLabel(args.dateTime, customer),
        ],
        bodySnapshot: (customer) =>
            ({
                de: `Hallo ${customer.firstName}, deine Anfrage für den ${eventDateLabel(args.dateTime, customer)} um ${eventTimeLabel(args.dateTime, customer)} ist bei uns angekommen.`,
                en: `Hi ${customer.firstName}, your request for ${eventDateLabel(args.dateTime, customer)} at ${eventTimeLabel(args.dateTime, customer)} has been received.`,
            })[customer.locale],
    });
}

/** Meta: `user_booking_request_create__for_cook` — body [cookName, locationName, dateLabel], button bookingRequestId. */
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
        buttonUrlParameter: args.bookingRequestId,
        bodyParameters: (cook) => [cook.firstName, args.city, eventDateLabel(args.dateTime, cook)],
        bodySnapshot: (cook) =>
            ({
                de: `Hallo ${cook.firstName}, neue Anfrage in ${args.city} für den ${eventDateLabel(args.dateTime, cook)}.`,
                en: `Hi ${cook.firstName}, new request in ${args.city} for ${eventDateLabel(args.dateTime, cook)}.`,
            })[cook.locale],
    });
}

/** Meta: `user_booking_request_update__for_cook` — body [cookName, userName], button bookingRequestOfferId. */
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
        buttonUrlParameter: args.bookingRequestOfferId,
        bodyParameters: (cook) => [cook.firstName, args.customerFirstName],
        bodySnapshot: (cook) =>
            ({
                de: `Hallo ${cook.firstName}, ${args.customerFirstName} hat die Anfrage geändert.`,
                en: `Hi ${cook.firstName}, ${args.customerFirstName} updated the booking request.`,
            })[cook.locale],
    });
}

/**
 * Meta: `cook_booking_request_offer_create__for_user`
 * body [userName, cookName, dateLabel, menusLabel, cookName], button bookingRequestId.
 */
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
        buttonUrlParameter: args.bookingRequestId,
        bodyParameters: (customer) => [
            customer.firstName,
            args.cookFirstName,
            eventDateLabel(args.dateTime, customer),
            args.menusLabel,
            args.cookFirstName,
        ],
        bodySnapshot: (customer) =>
            ({
                de: `Hallo ${customer.firstName}, ${args.cookFirstName} hat ein Angebot für den ${eventDateLabel(args.dateTime, customer)} erstellt.`,
                en: `Hi ${customer.firstName}, ${args.cookFirstName} created an offer for ${eventDateLabel(args.dateTime, customer)}.`,
            })[customer.locale],
    });
}

/**
 * Meta: `cook_menu_courses_update_with_relation_to_offer__for_user`
 * body [userName, cookName, dateLabel, cookName], button bookingRequestId.
 */
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
        buttonUrlParameter: args.bookingRequestId,
        bodyParameters: (customer) => [customer.firstName, args.cookFirstName, eventDateLabel(dateTime, customer), args.cookFirstName],
        bodySnapshot: (customer) =>
            ({
                de: `Hallo ${customer.firstName}, ${args.cookFirstName} hat die Menüvorschläge aktualisiert.`,
                en: `Hi ${customer.firstName}, ${args.cookFirstName} updated the suggested menus.`,
            })[customer.locale],
    });
}

/** No approved Meta template (predecessor never sent WA on customer accept confirm). */
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
        buttonUrlParameter: args.bookingRequestId,
        bodyParameters: (customer) => [customer.firstName, args.cookFirstName],
        bodySnapshot: (customer) =>
            ({
                de: `Hallo ${customer.firstName}, du hast das Angebot von ${args.cookFirstName} angenommen.`,
                en: `Hi ${customer.firstName}, you accepted ${args.cookFirstName}’s offer.`,
            })[customer.locale],
    });
}

/**
 * Meta: `user_booking_request_offer_accept__for_cook`
 * body [cookName, userName, dateLabel], button bookingRequestOfferId.
 */
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
        buttonUrlParameter: args.bookingRequestOfferId,
        bodyParameters: (cook) => [cook.firstName, args.customerFirstName, eventDateLabel(dateTime, cook)],
        bodySnapshot: (cook) =>
            ({
                de: `Hallo ${cook.firstName}, ${args.customerFirstName} hat dein Angebot für den ${eventDateLabel(dateTime, cook)} angenommen.`,
                en: `Hi ${cook.firstName}, ${args.customerFirstName} accepted your offer for ${eventDateLabel(dateTime, cook)}.`,
            })[cook.locale],
    });
}

/** No approved Meta template yet. */
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
        buttonUrlParameter: args.bookingRequestId,
        bodyParameters: (customer) => [customer.firstName, args.cookFirstName],
        bodySnapshot: (customer) =>
            ({
                de: `Hallo ${customer.firstName}, die Zahlung für dein Event mit ${args.cookFirstName} ist bestätigt.`,
                en: `Hi ${customer.firstName}, payment for your event with ${args.cookFirstName} is confirmed.`,
            })[customer.locale],
    });
}

/** No approved Meta template yet. */
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
        buttonUrlParameter: args.bookingRequestId,
        bodyParameters: (customer) => [customer.firstName, args.totalLabel],
        bodySnapshot: (customer) =>
            ({
                de: `Hallo ${customer.firstName}, wir ziehen bald ${args.totalLabel} von deiner hinterlegten Karte ein.`,
                en: `Hi ${customer.firstName}, we will soon charge ${args.totalLabel} to your saved card.`,
            })[customer.locale],
    });
}

/** No approved Meta template yet. */
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
        buttonUrlParameter: args.bookingRequestId,
        bodyParameters: (customer) => [customer.firstName],
        bodySnapshot: (customer) =>
            ({
                de: `Hallo ${customer.firstName}, deine Anfrage wurde storniert.`,
                en: `Hi ${customer.firstName}, your booking request was cancelled.`,
            })[customer.locale],
    });
}

/** No approved Meta template yet. */
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
        buttonUrlParameter: args.bookingRequestId,
        bodyParameters: (cook) => [cook.firstName, args.customerFirstName],
        bodySnapshot: (cook) =>
            ({
                de: `Hallo ${cook.firstName}, die Anfrage von ${args.customerFirstName} wurde storniert.`,
                en: `Hi ${cook.firstName}, ${args.customerFirstName}’s booking request was cancelled.`,
            })[cook.locale],
    });
}

/**
 * Meta: `cook_booking_request_offer_unread_notifications`
 * body [userName], button bookingRequestOfferId.
 */
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
        buttonUrlParameter: args.bookingRequestOfferId,
        bodyParameters: (customer) => [customer.firstName],
        bodySnapshot: (customer) =>
            ({
                de: `Hallo ${customer.firstName}, ${args.cookFirstName} hat dir im Chat geschrieben.`,
                en: `Hi ${customer.firstName}, ${args.cookFirstName} wrote to you in chat.`,
            })[customer.locale],
    });
}

/**
 * Meta: `user_booking_request_offer_unread_notifications`
 * body [cookName], button bookingRequestId.
 */
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
        buttonUrlParameter: args.bookingRequestId,
        bodyParameters: (cook) => [cook.firstName],
        bodySnapshot: (cook) =>
            ({
                de: `Hallo ${cook.firstName}, ${args.customerFirstName} hat dir im Chat geschrieben.`,
                en: `Hi ${cook.firstName}, ${args.customerFirstName} wrote to you in chat.`,
            })[cook.locale],
    });
}

/** Meta: `user_booking_request_reaction_reminder` — no body components, no URL button. */
export async function userBookingRequestReactionReminderWhatsAppSend(
    serverRuntime: ServerRuntime,
    args: { bookingRequestId: string; customerUserId: string },
): Promise<void> {
    await templateSend(serverRuntime, {
        label: 'userBookingRequestReactionReminderWhatsAppSend',
        entityId: args.bookingRequestId,
        recipientUserId: args.customerUserId,
        purpose: 'BOOKING_REQUEST_REACTION_REMINDER',
        relatedEntity: { type: 'BOOKING_REQUEST', id: args.bookingRequestId },
        bodyParameters: () => [],
        bodySnapshot: (customer) =>
            ({
                de: `Hallo ${customer.firstName}, hast du die Angebote zu deiner Anfrage schon gesehen?`,
                en: `Hi ${customer.firstName}, have you looked at the offers for your request yet?`,
            })[customer.locale],
    });
}
