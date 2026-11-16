import { eq } from 'drizzle-orm';

import { t } from '../../i18n/t';
import { formatBookingEventDateFromCountry, formatBookingWhenJoined } from '../../shared';
import type { Locale } from '../../shared/locale';
import { bookingRequestOffers, bookingRequests, cookCallSlotBookings, users } from '../db/schema';
import type { CookCallSlotBookingStatus } from '../domain/bookingRequest';
import { notificationWhatsAppAllowed } from '../domain/notificationSettings';
import type { UserNotificationSettingsStored } from '../domain/notificationSettings';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { OutboundWhatsAppPurpose } from '../domain/whatsapp';
import { whatsappPhoneNumberNormalize } from '../domain/whatsapp';
import {
    formatCallSlotDate,
    formatCallSlotTime,
    formatCallSlotWhenSecondary,
} from '../email/components/bookingRequestOfferCallSlotEmailFormat';

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
    status: CookCallSlotBookingStatus;
    bookingRequestOfferId: string;
    bookingRequestId: string;
    startAt: Date;
    endAt: Date;
    occasion: string;
    bookingRequestDateTime: Date;
    eventCountry: string;
    customerUserId: string;
    cookId: string;
    customer: {
        firstName: string;
        locale: Locale;
        timeZone: string;
        phoneNumber: string | null;
        notificationSettings: UserNotificationSettingsStored;
    };
    cookUser: {
        firstName: string;
        locale: Locale;
        timeZone: string;
        phoneNumber: string | null;
        notificationSettings: UserNotificationSettingsStored;
    };
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
            exactEventAddress: bookingRequests.exactEventAddress,
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
                notificationSettings: users.notificationSettings,
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
                notificationSettings: users.notificationSettings,
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
        status: row.booking.status,
        bookingRequestOfferId: row.bookingRequestOfferId,
        bookingRequestId: row.bookingRequestId,
        startAt: row.booking.startAt,
        endAt: row.booking.endAt,
        occasion: row.occasion,
        bookingRequestDateTime: row.bookingRequestDateTime,
        eventCountry: row.exactEventAddress.country,
        customerUserId: row.customerUserId,
        cookId: row.cookId,
        customer: {
            firstName: customer.firstName,
            locale: customer.locale,
            timeZone: customer.timeZone,
            phoneNumber: customer.phoneNumber,
            notificationSettings: customer.notificationSettings,
        },
        cookUser: {
            firstName: cookUser.firstName,
            locale: cookUser.locale,
            timeZone: cookUser.timeZone,
            phoneNumber: cookUser.phoneNumber,
            notificationSettings: cookUser.notificationSettings,
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
    if (!notificationWhatsAppAllowed(user.notificationSettings, args.purpose, args.recipient)) {
        serverRuntime.log.info(
            `${args.label}: skip WhatsApp for ${args.context.cookCallSlotBookingId} (notification settings for user ${userId})`,
        );
        return;
    }
    const toPhoneNumber = whatsappPhoneNumberNormalize(user.phoneNumber);
    if (!toPhoneNumber) {
        serverRuntime.log.info(
            `${args.label}: skip WhatsApp for ${args.context.cookCallSlotBookingId} (user ${userId} phone missing or not E.164 with country code; raw=${JSON.stringify(user.phoneNumber)})`,
        );
        return;
    }

    const peer = args.recipient === 'COOK' ? args.context.customer : args.context.cookUser;
    const dateLabel = formatCallSlotDate(args.context.startAt, user.locale, user.timeZone);
    const timeLabel = formatBookingWhenJoined({
        primary: formatCallSlotTime(args.context.startAt, user.locale, user.timeZone),
        secondary: formatCallSlotWhenSecondary({
            startAt: args.context.startAt,
            endAt: args.context.endAt,
            locale: user.locale,
            viewerTimeZone: user.timeZone,
            peer: { name: peer.firstName, timeZone: peer.timeZone },
        }),
    });
    const bookingRequestDateLabel = formatBookingEventDateFromCountry({
        instant: args.context.bookingRequestDateTime,
        locale: user.locale,
        venueCountry: args.context.eventCountry,
        dateStyle: 'long',
        weekday: true,
    });
    const bodyParameters =
        args.purpose === 'CALL_SLOT_BOOKING_CANCEL' || args.purpose === 'CALL_SLOT_BOOKING_DECLINE'
            ? [user.firstName, args.senderFirstName, args.reason?.trim() || t(user.locale, 'common', 'callSlotNoReason')]
            : args.purpose === 'CALL_SLOT_BOOKING_CREATE'
              ? [user.firstName, args.senderFirstName, dateLabel, timeLabel, bookingRequestDateLabel, args.context.occasion]
              : [user.firstName, args.senderFirstName, dateLabel, timeLabel];

    await sendSafely(serverRuntime, args.label, args.context.cookCallSlotBookingId, () =>
        serverRuntime.whatsapp.sendTemplate({
            purpose: args.purpose,
            toPhoneNumber,
            locale: user.locale,
            bodyParameters,
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
        purpose: context.status === 'DECLINED' ? 'CALL_SLOT_BOOKING_DECLINE' : 'CALL_SLOT_BOOKING_CANCEL',
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
