import { eq } from 'drizzle-orm';

import type { Locale } from '../../shared/locale';
import { bookingRequestOffers, bookingRequests, cookCallSlotBookings, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { bookingRequestOfferCallSlotOfferUrls } from '../email/components/bookingRequestOfferCallSlotEmailFormat';
import {
    BookingRequestOfferCallSlotCancelForCookEmail,
    bookingRequestOfferCallSlotCancelForCookEmailSubject,
} from '../email/templates/BookingRequestOfferCallSlotCancelForCookEmail';
import {
    BookingRequestOfferCallSlotCancelForCustomerEmail,
    bookingRequestOfferCallSlotCancelForCustomerEmailSubject,
} from '../email/templates/BookingRequestOfferCallSlotCancelForCustomerEmail';
import {
    BookingRequestOfferCallSlotConfirmForCookEmail,
    bookingRequestOfferCallSlotConfirmForCookEmailSubject,
} from '../email/templates/BookingRequestOfferCallSlotConfirmForCookEmail';
import {
    BookingRequestOfferCallSlotConfirmForCustomerEmail,
    bookingRequestOfferCallSlotConfirmForCustomerEmailSubject,
} from '../email/templates/BookingRequestOfferCallSlotConfirmForCustomerEmail';
import {
    BookingRequestOfferCallSlotDeclineForCookEmail,
    bookingRequestOfferCallSlotDeclineForCookEmailSubject,
} from '../email/templates/BookingRequestOfferCallSlotDeclineForCookEmail';
import {
    BookingRequestOfferCallSlotDeclineForCustomerEmail,
    bookingRequestOfferCallSlotDeclineForCustomerEmailSubject,
} from '../email/templates/BookingRequestOfferCallSlotDeclineForCustomerEmail';
import {
    BookingRequestOfferCallSlotRequestForCookEmail,
    bookingRequestOfferCallSlotRequestForCookEmailSubject,
} from '../email/templates/BookingRequestOfferCallSlotRequestForCookEmail';
import {
    BookingRequestOfferCallSlotRequestForCustomerEmail,
    bookingRequestOfferCallSlotRequestForCustomerEmailSubject,
} from '../email/templates/BookingRequestOfferCallSlotRequestForCustomerEmail';
import { environmentVariables } from '../env/environmentVariablesCreate';
import {
    bookingRequestOfferCallSlotCancelWhatsAppSend,
    bookingRequestOfferCallSlotConfirmWhatsAppSend,
    bookingRequestOfferCallSlotRequestWhatsAppSend,
} from './bookingRequestOfferCallSlotWhatsApp';
import { emailAddressPresent } from './emailAddressPresent';

type CallSlotEmailContext = {
    cookCallSlotBookingId: string;
    bookingRequestOfferId: string;
    bookingRequestId: string;
    startAt: Date;
    occasion: string;
    eventDateTime: Date;
    customerUserId: string;
    cookId: string;
    customer: { emailAddress: string; firstName: string; locale: Locale; timeZone: string };
    cookUser: { emailAddress: string; firstName: string; locale: Locale; timeZone: string };
};

async function callSlotEmailContextLoad(serverRuntime: ServerRuntime, cookCallSlotBookingId: string): Promise<CallSlotEmailContext | null> {
    const [row] = await serverRuntime.db
        .select({
            booking: cookCallSlotBookings,
            bookingRequestId: bookingRequests.bookingRequestId,
            customerUserId: bookingRequests.userId,
            occasion: bookingRequests.occasion,
            eventDateTime: bookingRequests.dateTime,
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
            .select({ emailAddress: users.emailAddress, firstName: users.firstName, locale: users.locale, timeZone: users.timeZone })
            .from(users)
            .where(eq(users.userId, row.customerUserId))
            .limit(1)
            .then((rows) => rows[0]),
        serverRuntime.db
            .select({ emailAddress: users.emailAddress, firstName: users.firstName, locale: users.locale, timeZone: users.timeZone })
            .from(users)
            .where(eq(users.userId, row.cookId))
            .limit(1)
            .then((rows) => rows[0]),
    ]);

    const customerWithEmail = emailAddressPresent(customer);
    const cookUserWithEmail = emailAddressPresent(cookUser);
    if (!customerWithEmail || !cookUserWithEmail) {
        return null;
    }

    return {
        cookCallSlotBookingId: row.booking.cookCallSlotBookingId,
        bookingRequestOfferId: row.bookingRequestOfferId,
        bookingRequestId: row.bookingRequestId,
        startAt: row.booking.startAt,
        occasion: row.occasion,
        eventDateTime: row.eventDateTime,
        customerUserId: row.customerUserId,
        cookId: row.cookId,
        customer: customerWithEmail,
        cookUser: cookUserWithEmail,
    };
}

async function sendSafely(
    serverRuntime: ServerRuntime,
    label: string,
    cookCallSlotBookingId: string,
    send: () => Promise<unknown>,
): Promise<void> {
    try {
        await send();
    } catch (error) {
        serverRuntime.log.error(
            error instanceof Error
                ? new Error(`${label}: email failed for ${cookCallSlotBookingId}: ${error.message}`, { cause: error })
                : error,
            null,
        );
    }
}

/**
 * Notify the counterparty that a new call-slot request is waiting for confirm/decline.
 * Failures are logged and do not undo the booking write.
 */
export async function bookingRequestOfferCallSlotRequestEmailSend(
    serverRuntime: ServerRuntime,
    args: { cookCallSlotBookingId: string; recipient: 'COOK' | 'CUSTOMER' },
): Promise<void> {
    const context = await callSlotEmailContextLoad(serverRuntime, args.cookCallSlotBookingId);
    if (!context) {
        return;
    }

    const webPageUrl = environmentVariables.webPageUrl.replace(/\/$/, '');
    const locale = args.recipient === 'COOK' ? context.cookUser.locale : context.customer.locale;
    const timeZone = args.recipient === 'COOK' ? context.cookUser.timeZone : context.customer.timeZone;
    const urls = bookingRequestOfferCallSlotOfferUrls(webPageUrl, context.bookingRequestId, context.bookingRequestOfferId);

    if (args.recipient === 'COOK') {
        await Promise.all([
            sendSafely(serverRuntime, 'bookingRequestOfferCallSlotRequestEmailSend', args.cookCallSlotBookingId, () =>
                serverRuntime.email.send({
                    to: context.cookUser.emailAddress,
                    subject: bookingRequestOfferCallSlotRequestForCookEmailSubject(locale),
                    react: BookingRequestOfferCallSlotRequestForCookEmail({
                        locale,
                        timeZone,
                        webPageUrl,
                        recipientFirstName: context.cookUser.firstName,
                        senderFirstName: context.customer.firstName,
                        startAt: context.startAt,
                        eventDateTime: context.eventDateTime,
                        occasion: context.occasion,
                        offerUrl: urls.cook,
                    }),
                    purpose: 'CALL_SLOT_BOOKING_REQUEST',
                    locale,
                    relatedEntity: { type: 'COOK_CALL_SLOT_BOOKING', id: context.cookCallSlotBookingId },
                    userId: context.cookId,
                }),
            ),
            bookingRequestOfferCallSlotRequestWhatsAppSend(serverRuntime, args),
        ]);
        return;
    }

    await Promise.all([
        sendSafely(serverRuntime, 'bookingRequestOfferCallSlotRequestEmailSend', args.cookCallSlotBookingId, () =>
            serverRuntime.email.send({
                to: context.customer.emailAddress,
                subject: bookingRequestOfferCallSlotRequestForCustomerEmailSubject(locale),
                react: BookingRequestOfferCallSlotRequestForCustomerEmail({
                    locale,
                    timeZone,
                    webPageUrl,
                    recipientFirstName: context.customer.firstName,
                    senderFirstName: context.cookUser.firstName,
                    startAt: context.startAt,
                    eventDateTime: context.eventDateTime,
                    occasion: context.occasion,
                    offerUrl: urls.customer,
                }),
                purpose: 'CALL_SLOT_BOOKING_REQUEST',
                locale,
                relatedEntity: { type: 'COOK_CALL_SLOT_BOOKING', id: context.cookCallSlotBookingId },
                userId: context.customerUserId,
            }),
        ),
        bookingRequestOfferCallSlotRequestWhatsAppSend(serverRuntime, args),
    ]);
}

/**
 * Notify the requester that the counterparty confirmed the slot.
 */
export async function bookingRequestOfferCallSlotConfirmEmailSend(
    serverRuntime: ServerRuntime,
    args: { cookCallSlotBookingId: string; recipient: 'COOK' | 'CUSTOMER' },
): Promise<void> {
    const context = await callSlotEmailContextLoad(serverRuntime, args.cookCallSlotBookingId);
    if (!context) {
        return;
    }

    const webPageUrl = environmentVariables.webPageUrl.replace(/\/$/, '');
    const locale = args.recipient === 'COOK' ? context.cookUser.locale : context.customer.locale;
    const timeZone = args.recipient === 'COOK' ? context.cookUser.timeZone : context.customer.timeZone;
    const urls = bookingRequestOfferCallSlotOfferUrls(webPageUrl, context.bookingRequestId, context.bookingRequestOfferId);

    if (args.recipient === 'COOK') {
        await Promise.all([
            sendSafely(serverRuntime, 'bookingRequestOfferCallSlotConfirmEmailSend', args.cookCallSlotBookingId, () =>
                serverRuntime.email.send({
                    to: context.cookUser.emailAddress,
                    subject: bookingRequestOfferCallSlotConfirmForCookEmailSubject(locale),
                    react: BookingRequestOfferCallSlotConfirmForCookEmail({
                        locale,
                        timeZone,
                        webPageUrl,
                        recipientFirstName: context.cookUser.firstName,
                        accepterFirstName: context.customer.firstName,
                        startAt: context.startAt,
                        offerUrl: urls.cook,
                    }),
                    purpose: 'CALL_SLOT_BOOKING_CONFIRM',
                    locale,
                    relatedEntity: { type: 'COOK_CALL_SLOT_BOOKING', id: context.cookCallSlotBookingId },
                    userId: context.cookId,
                }),
            ),
            bookingRequestOfferCallSlotConfirmWhatsAppSend(serverRuntime, args),
        ]);
        return;
    }

    await Promise.all([
        sendSafely(serverRuntime, 'bookingRequestOfferCallSlotConfirmEmailSend', args.cookCallSlotBookingId, () =>
            serverRuntime.email.send({
                to: context.customer.emailAddress,
                subject: bookingRequestOfferCallSlotConfirmForCustomerEmailSubject(locale),
                react: BookingRequestOfferCallSlotConfirmForCustomerEmail({
                    locale,
                    timeZone,
                    webPageUrl,
                    recipientFirstName: context.customer.firstName,
                    accepterFirstName: context.cookUser.firstName,
                    startAt: context.startAt,
                    offerUrl: urls.customer,
                }),
                purpose: 'CALL_SLOT_BOOKING_CONFIRM',
                locale,
                relatedEntity: { type: 'COOK_CALL_SLOT_BOOKING', id: context.cookCallSlotBookingId },
                userId: context.customerUserId,
            }),
        ),
        bookingRequestOfferCallSlotConfirmWhatsAppSend(serverRuntime, args),
    ]);
}

/**
 * Notify the requester that the counterparty declined the pending slot.
 */
export async function bookingRequestOfferCallSlotDeclineEmailSend(
    serverRuntime: ServerRuntime,
    args: { cookCallSlotBookingId: string; recipient: 'COOK' | 'CUSTOMER'; reason?: string },
): Promise<void> {
    const context = await callSlotEmailContextLoad(serverRuntime, args.cookCallSlotBookingId);
    if (!context) {
        return;
    }

    const webPageUrl = environmentVariables.webPageUrl.replace(/\/$/, '');
    const locale = args.recipient === 'COOK' ? context.cookUser.locale : context.customer.locale;
    const urls = bookingRequestOfferCallSlotOfferUrls(webPageUrl, context.bookingRequestId, context.bookingRequestOfferId);

    if (args.recipient === 'COOK') {
        await Promise.all([
            sendSafely(serverRuntime, 'bookingRequestOfferCallSlotDeclineEmailSend', args.cookCallSlotBookingId, () =>
                serverRuntime.email.send({
                    to: context.cookUser.emailAddress,
                    subject: bookingRequestOfferCallSlotDeclineForCookEmailSubject(locale),
                    react: BookingRequestOfferCallSlotDeclineForCookEmail({
                        locale,
                        webPageUrl,
                        recipientFirstName: context.cookUser.firstName,
                        declinerFirstName: context.customer.firstName,
                        reason: args.reason,
                        offerUrl: urls.cook,
                    }),
                    purpose: 'CALL_SLOT_BOOKING_DECLINE',
                    locale,
                    relatedEntity: { type: 'COOK_CALL_SLOT_BOOKING', id: context.cookCallSlotBookingId },
                    userId: context.cookId,
                }),
            ),
            bookingRequestOfferCallSlotCancelWhatsAppSend(serverRuntime, {
                cookCallSlotBookingId: args.cookCallSlotBookingId,
                recipient: args.recipient,
                reason: args.reason,
            }),
        ]);
        return;
    }

    await Promise.all([
        sendSafely(serverRuntime, 'bookingRequestOfferCallSlotDeclineEmailSend', args.cookCallSlotBookingId, () =>
            serverRuntime.email.send({
                to: context.customer.emailAddress,
                subject: bookingRequestOfferCallSlotDeclineForCustomerEmailSubject(locale),
                react: BookingRequestOfferCallSlotDeclineForCustomerEmail({
                    locale,
                    webPageUrl,
                    recipientFirstName: context.customer.firstName,
                    declinerFirstName: context.cookUser.firstName,
                    reason: args.reason,
                    offerUrl: urls.customer,
                }),
                purpose: 'CALL_SLOT_BOOKING_DECLINE',
                locale,
                relatedEntity: { type: 'COOK_CALL_SLOT_BOOKING', id: context.cookCallSlotBookingId },
                userId: context.customerUserId,
            }),
        ),
        bookingRequestOfferCallSlotCancelWhatsAppSend(serverRuntime, {
            cookCallSlotBookingId: args.cookCallSlotBookingId,
            recipient: args.recipient,
            reason: args.reason,
        }),
    ]);
}

/**
 * Notify the counterparty that a pending or confirmed slot was canceled.
 * Not used for sibling auto-cancels (`ANOTHER_SLOT_CONFIRMED`).
 */
export async function bookingRequestOfferCallSlotCancelEmailSend(
    serverRuntime: ServerRuntime,
    args: {
        cookCallSlotBookingId: string;
        recipient: 'COOK' | 'CUSTOMER';
        reason?: string;
        wasConfirmed: boolean;
    },
): Promise<void> {
    const context = await callSlotEmailContextLoad(serverRuntime, args.cookCallSlotBookingId);
    if (!context) {
        return;
    }

    const webPageUrl = environmentVariables.webPageUrl.replace(/\/$/, '');
    const locale = args.recipient === 'COOK' ? context.cookUser.locale : context.customer.locale;
    const timeZone = args.recipient === 'COOK' ? context.cookUser.timeZone : context.customer.timeZone;
    const urls = bookingRequestOfferCallSlotOfferUrls(webPageUrl, context.bookingRequestId, context.bookingRequestOfferId);

    if (args.recipient === 'COOK') {
        await Promise.all([
            sendSafely(serverRuntime, 'bookingRequestOfferCallSlotCancelEmailSend', args.cookCallSlotBookingId, () =>
                serverRuntime.email.send({
                    to: context.cookUser.emailAddress,
                    subject: bookingRequestOfferCallSlotCancelForCookEmailSubject(locale),
                    react: BookingRequestOfferCallSlotCancelForCookEmail({
                        locale,
                        timeZone,
                        webPageUrl,
                        recipientFirstName: context.cookUser.firstName,
                        cancelerFirstName: context.customer.firstName,
                        startAt: context.startAt,
                        reason: args.reason,
                        wasConfirmed: args.wasConfirmed,
                        offerUrl: urls.cook,
                    }),
                    purpose: 'CALL_SLOT_BOOKING_CANCEL',
                    locale,
                    relatedEntity: { type: 'COOK_CALL_SLOT_BOOKING', id: context.cookCallSlotBookingId },
                    userId: context.cookId,
                }),
            ),
            bookingRequestOfferCallSlotCancelWhatsAppSend(serverRuntime, {
                cookCallSlotBookingId: args.cookCallSlotBookingId,
                recipient: args.recipient,
                reason: args.reason,
            }),
        ]);
        return;
    }

    await Promise.all([
        sendSafely(serverRuntime, 'bookingRequestOfferCallSlotCancelEmailSend', args.cookCallSlotBookingId, () =>
            serverRuntime.email.send({
                to: context.customer.emailAddress,
                subject: bookingRequestOfferCallSlotCancelForCustomerEmailSubject(locale),
                react: BookingRequestOfferCallSlotCancelForCustomerEmail({
                    locale,
                    timeZone,
                    webPageUrl,
                    recipientFirstName: context.customer.firstName,
                    cancelerFirstName: context.cookUser.firstName,
                    startAt: context.startAt,
                    reason: args.reason,
                    wasConfirmed: args.wasConfirmed,
                    offerUrl: urls.customer,
                }),
                purpose: 'CALL_SLOT_BOOKING_CANCEL',
                locale,
                relatedEntity: { type: 'COOK_CALL_SLOT_BOOKING', id: context.cookCallSlotBookingId },
                userId: context.customerUserId,
            }),
        ),
        bookingRequestOfferCallSlotCancelWhatsAppSend(serverRuntime, {
            cookCallSlotBookingId: args.cookCallSlotBookingId,
            recipient: args.recipient,
            reason: args.reason,
        }),
    ]);
}
