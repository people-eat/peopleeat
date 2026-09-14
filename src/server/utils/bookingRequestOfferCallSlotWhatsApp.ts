import { eq } from 'drizzle-orm';

import { bookingRequestOffers, bookingRequests, cookCallSlotBookings, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { OutboundWhatsAppPurpose } from '../domain/whatsapp';
import { whatsappPhoneNumberNormalize } from '../domain/whatsapp';
import { formatCallSlotDate, formatCallSlotTime } from '../email/components/bookingRequestOfferCallSlotEmailFormat';

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

type CallSlotWhatsAppContext = {
    cookCallSlotBookingId: string;
    bookingRequestOfferId: string;
    bookingRequestId: string;
    startAt: Date;
    occasion: string;
    bookingRequestDateTime: Date;
    customerUserId: string;
    cookId: string;
    customer: { firstName: string; locale: 'de' | 'en'; timeZone: string; phoneNumber: string | null };
    cookUser: { firstName: string; locale: 'de' | 'en'; timeZone: string; phoneNumber: string | null };
};

async function callSlotWhatsAppContextLoad(
    serverRuntime: ServerRuntime,
    cookCallSlotBookingId: string,
): Promise<CallSlotWhatsAppContext | null> {
    const [row] = await serverRuntime.db
        .select({
            booking: cookCallSlotBookings,
            bookingRequestId: bookingRequests.bookingRequestId,
            customerUserId: bookingRequests.userId,
            occasion: bookingRequests.occasion,
            bookingRequestDateTime: bookingRequests.dateTime,
            cookId: bookingRequestOffers.cookId,
            bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId,
        })
        .from(cookCallSlotBookings)
        .innerJoin(bookingRequestOffers, eq(bookingRequestOffers.bookingRequestOfferId, cookCallSlotBookings.bookingRequestOfferId))
        .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
        .where(eq(cookCallSlotBookings.cookCallSlotBookingId, cookCallSlotBookingId))
        .limit(1);

    if (!row) {
        return null;
    }

    const [customer, cookUser] = await Promise.all([
        serverRuntime.db
            .select({
                emailAddress: users.emailAddress,
                firstName: users.firstName,
                locale: users.locale,
                timeZone: users.timeZone,
                phoneNumber: users.phoneNumber,
            })
            .from(users)
            .where(eq(users.userId, row.customerUserId))
            .limit(1)
            .then((rows) => rows[0]),
        serverRuntime.db
            .select({
                emailAddress: users.emailAddress,
                firstName: users.firstName,
                locale: users.locale,
                timeZone: users.timeZone,
                phoneNumber: users.phoneNumber,
            })
            .from(users)
            .where(eq(users.userId, row.cookId))
            .limit(1)
            .then((rows) => rows[0]),
    ]);

    if (!customer || !cookUser) {
        return null;
    }

    return {
        cookCallSlotBookingId: row.booking.cookCallSlotBookingId,
        bookingRequestOfferId: row.bookingRequestOfferId,
        bookingRequestId: row.bookingRequestId,
        startAt: row.booking.startAt,
        occasion: row.occasion,
        bookingRequestDateTime: row.bookingRequestDateTime,
        customerUserId: row.customerUserId,
        cookId: row.cookId,
        customer: {
            firstName: customer.firstName,
            locale: customer.locale,
            timeZone: customer.timeZone,
            phoneNumber: customer.phoneNumber,
        },
        cookUser: {
            firstName: cookUser.firstName,
            locale: cookUser.locale,
            timeZone: cookUser.timeZone,
            phoneNumber: cookUser.phoneNumber,
        },
    };
}

async function recipientSend(
    serverRuntime: ServerRuntime,
    args: {
        label: string;
        context: CallSlotWhatsAppContext;
        recipient: 'COOK' | 'CUSTOMER';
        purpose: Exclude<OutboundWhatsAppPurpose, 'CONCIERGE_SESSION_REPLY'>;
        senderFirstName: string;
        reason?: string;
    },
): Promise<void> {
    const user = args.recipient === 'COOK' ? args.context.cookUser : args.context.customer;
    const userId = args.recipient === 'COOK' ? args.context.cookId : args.context.customerUserId;
    const toPhoneNumber = whatsappPhoneNumberNormalize(user.phoneNumber);
    if (!toPhoneNumber) {
        serverRuntime.log.info(
            `${args.label}: skip WhatsApp for ${args.context.cookCallSlotBookingId} (user ${userId} phone missing or not E.164 with country code; raw=${JSON.stringify(user.phoneNumber)})`,
        );
        return;
    }

    const dateLabel = formatCallSlotDate(args.context.startAt, user.locale, user.timeZone);
    const timeLabel = formatCallSlotTime(args.context.startAt, user.locale, user.timeZone);
    const bookingRequestDateLabel = formatCallSlotDate(args.context.bookingRequestDateTime, user.locale, user.timeZone);
    // Predecessor Meta templates: create uses 6 body params; confirm/reminder/cancel have no URL button.
    const bodyParameters =
        args.purpose === 'CALL_SLOT_BOOKING_CANCEL'
            ? [user.firstName, args.senderFirstName, args.reason ?? '']
            : args.purpose === 'CALL_SLOT_BOOKING_CREATE'
              ? [user.firstName, args.senderFirstName, dateLabel, timeLabel, bookingRequestDateLabel, args.context.occasion]
              : [user.firstName, args.senderFirstName, dateLabel, timeLabel];

    const bodySnapshot =
        args.purpose === 'CALL_SLOT_BOOKING_CANCEL'
            ? {
                  de: `Hallo ${user.firstName}, ${args.senderFirstName} hat den Videocall abgesagt.`,
                  en: `Hi ${user.firstName}, ${args.senderFirstName} cancelled the video call.`,
              }[user.locale]
            : args.purpose === 'CALL_SLOT_BOOKING_CONFIRM'
              ? {
                    de: `Hallo ${user.firstName}, ${args.senderFirstName} hat den Videocall am ${dateLabel} um ${timeLabel} bestätigt.`,
                    en: `Hi ${user.firstName}, ${args.senderFirstName} confirmed the video call on ${dateLabel} at ${timeLabel}.`,
                }[user.locale]
              : args.purpose === 'CALL_SLOT_BOOKING_REMINDER'
                ? {
                      de: `Hallo ${user.firstName}, Erinnerung: Videocall mit ${args.senderFirstName} am ${dateLabel} um ${timeLabel}.`,
                      en: `Hi ${user.firstName}, reminder: video call with ${args.senderFirstName} on ${dateLabel} at ${timeLabel}.`,
                  }[user.locale]
                : {
                      de: `Hallo ${user.firstName}, ${args.senderFirstName} möchte einen Videocall am ${dateLabel} um ${timeLabel} für ${args.context.occasion}.`,
                      en: `Hi ${user.firstName}, ${args.senderFirstName} wants a video call on ${dateLabel} at ${timeLabel} for ${args.context.occasion}.`,
                  }[user.locale];

    await sendSafely(serverRuntime, args.label, args.context.cookCallSlotBookingId, () =>
        serverRuntime.whatsapp.sendTemplate({
            purpose: args.purpose,
            toPhoneNumber,
            locale: user.locale,
            bodyParameters,
            bodySnapshot,
            userId,
            relatedEntity: { type: 'COOK_CALL_SLOT_BOOKING', id: args.context.cookCallSlotBookingId },
        }),
    );
}

export async function bookingRequestOfferCallSlotRequestWhatsAppSend(
    serverRuntime: ServerRuntime,
    args: { cookCallSlotBookingId: string; recipient: 'COOK' | 'CUSTOMER' },
): Promise<void> {
    const context = await callSlotWhatsAppContextLoad(serverRuntime, args.cookCallSlotBookingId);
    if (!context) return;
    await recipientSend(serverRuntime, {
        label: 'bookingRequestOfferCallSlotRequestWhatsAppSend',
        context,
        recipient: args.recipient,
        purpose: 'CALL_SLOT_BOOKING_CREATE',
        senderFirstName: args.recipient === 'COOK' ? context.customer.firstName : context.cookUser.firstName,
    });
}

export async function bookingRequestOfferCallSlotConfirmWhatsAppSend(
    serverRuntime: ServerRuntime,
    args: { cookCallSlotBookingId: string; recipient: 'COOK' | 'CUSTOMER' },
): Promise<void> {
    const context = await callSlotWhatsAppContextLoad(serverRuntime, args.cookCallSlotBookingId);
    if (!context) return;
    await recipientSend(serverRuntime, {
        label: 'bookingRequestOfferCallSlotConfirmWhatsAppSend',
        context,
        recipient: args.recipient,
        purpose: 'CALL_SLOT_BOOKING_CONFIRM',
        senderFirstName: args.recipient === 'COOK' ? context.customer.firstName : context.cookUser.firstName,
    });
}

export async function bookingRequestOfferCallSlotCancelWhatsAppSend(
    serverRuntime: ServerRuntime,
    args: { cookCallSlotBookingId: string; recipient: 'COOK' | 'CUSTOMER'; reason?: string },
): Promise<void> {
    const context = await callSlotWhatsAppContextLoad(serverRuntime, args.cookCallSlotBookingId);
    if (!context) return;
    await recipientSend(serverRuntime, {
        label: 'bookingRequestOfferCallSlotCancelWhatsAppSend',
        context,
        recipient: args.recipient,
        purpose: 'CALL_SLOT_BOOKING_CANCEL',
        senderFirstName: args.recipient === 'COOK' ? context.customer.firstName : context.cookUser.firstName,
        reason: args.reason,
    });
}

export async function bookingRequestOfferCallSlotReminderWhatsAppSend(
    serverRuntime: ServerRuntime,
    args: { cookCallSlotBookingId: string },
): Promise<void> {
    const context = await callSlotWhatsAppContextLoad(serverRuntime, args.cookCallSlotBookingId);
    if (!context) return;
    await Promise.all([
        recipientSend(serverRuntime, {
            label: 'bookingRequestOfferCallSlotReminderWhatsAppSend.customer',
            context,
            recipient: 'CUSTOMER',
            purpose: 'CALL_SLOT_BOOKING_REMINDER',
            senderFirstName: context.cookUser.firstName,
        }),
        recipientSend(serverRuntime, {
            label: 'bookingRequestOfferCallSlotReminderWhatsAppSend.cook',
            context,
            recipient: 'COOK',
            purpose: 'CALL_SLOT_BOOKING_REMINDER',
            senderFirstName: context.customer.firstName,
        }),
    ]);
}
