import { eq, inArray } from 'drizzle-orm';

import { formatCurrency } from '../../shared';
import { bookingRequestPriceClassLabel } from '../../shared/bookingRequestFormDefaults';
import type { Locale } from '../../shared/locale';
import { bookingRequestOffers, bookingRequestParticipants, bookingRequests, users } from '../db/schema';
import type { BookingRequest, BookingRequestOffer } from '../db/schema';
import { notificationEmailAllowed } from '../domain/notificationSettings';
import type { NotificationAudience, UserNotificationSettingsStored } from '../domain/notificationSettings';
import type { OutboundEmailPurpose } from '../domain/outboundEmail';
import type { ServerRuntime } from '../domain/ServerRuntime';
import {
    bookingRequestEmailCookOfferUrl,
    bookingRequestEmailCustomerOfferUrl,
    bookingRequestEmailCustomerRequestUrl,
} from '../email/components/bookingRequestEmailUrls';
import {
    BookingEventCalendarDateMovedEmail,
    bookingEventCalendarDateMovedEmailSubject,
} from '../email/templates/BookingEventCalendarDateMovedEmail';
import {
    BookingEventCalendarRestoredEmail,
    bookingEventCalendarRestoredEmailSubject,
} from '../email/templates/BookingEventCalendarRestoredEmail';
import {
    BookingRequestOfferPaymentFinalizeForCustomerEmail,
    bookingRequestOfferPaymentFinalizeForCustomerEmailSubject,
} from '../email/templates/BookingRequestOfferPaymentFinalizeForCustomerEmail';
import {
    BookingRequestOfferPaymentStatementForCookEmail,
    bookingRequestOfferPaymentStatementForCookEmailSubject,
} from '../email/templates/BookingRequestOfferPaymentStatementForCookEmail';
import {
    BookingRequestOfferPullPaymentAnnouncementForCustomerEmail,
    bookingRequestOfferPullPaymentAnnouncementForCustomerEmailSubject,
} from '../email/templates/BookingRequestOfferPullPaymentAnnouncementForCustomerEmail';
import {
    CookBookingRequestOfferCreateForCustomerEmail,
    cookBookingRequestOfferCreateForCustomerEmailSubject,
} from '../email/templates/CookBookingRequestOfferCreateForCustomerEmail';
import {
    CookBookingRequestOfferParticipantAmendmentAcceptForCustomerEmail,
    cookBookingRequestOfferParticipantAmendmentAcceptForCustomerEmailSubject,
} from '../email/templates/CookBookingRequestOfferParticipantAmendmentAcceptForCustomerEmail';
import {
    CookBookingRequestOfferParticipantAmendmentDeclineForCustomerEmail,
    cookBookingRequestOfferParticipantAmendmentDeclineForCustomerEmailSubject,
} from '../email/templates/CookBookingRequestOfferParticipantAmendmentDeclineForCustomerEmail';
import {
    CookBookingRequestOfferSuggestedMenusUpdateForCustomerEmail,
    cookBookingRequestOfferSuggestedMenusUpdateForCustomerEmailSubject,
} from '../email/templates/CookBookingRequestOfferSuggestedMenusUpdateForCustomerEmail';
import {
    UserBookingRequestCancelForCookEmail,
    userBookingRequestCancelForCookEmailSubject,
} from '../email/templates/UserBookingRequestCancelForCookEmail';
import {
    UserBookingRequestCancelForCustomerEmail,
    userBookingRequestCancelForCustomerEmailSubject,
} from '../email/templates/UserBookingRequestCancelForCustomerEmail';
import {
    UserBookingRequestCreateForCustomerEmail,
    userBookingRequestCreateForCustomerEmailSubject,
} from '../email/templates/UserBookingRequestCreateForCustomerEmail';
import {
    UserBookingRequestOfferAcceptForCookEmail,
    userBookingRequestOfferAcceptForCookEmailSubject,
} from '../email/templates/UserBookingRequestOfferAcceptForCookEmail';
import {
    UserBookingRequestOfferAcceptForNotChosenCookEmail,
    userBookingRequestOfferAcceptForNotChosenCookEmailSubject,
} from '../email/templates/UserBookingRequestOfferAcceptForNotChosenCookEmail';
import {
    UserBookingRequestOfferDeclineForCookEmail,
    userBookingRequestOfferDeclineForCookEmailSubject,
} from '../email/templates/UserBookingRequestOfferDeclineForCookEmail';
import {
    UserBookingRequestOfferParticipantAmendmentCreateForCookEmail,
    userBookingRequestOfferParticipantAmendmentCreateForCookEmailSubject,
} from '../email/templates/UserBookingRequestOfferParticipantAmendmentCreateForCookEmail';
import {
    UserBookingRequestUpdateForCookEmail,
    userBookingRequestUpdateForCookEmailSubject,
} from '../email/templates/UserBookingRequestUpdateForCookEmail';
import { environmentVariables } from '../env/environmentVariablesCreate';
import { bookingEventCalendarAttachment } from './bookingEventCalendarFile';
import {
    bookingRequestOfferPaymentConfirmedWhatsAppSend,
    bookingRequestOfferPullPaymentAnnouncementWhatsAppSend,
    cookBookingRequestOfferCreateWhatsAppSend,
    cookBookingRequestOfferSuggestedMenusUpdateWhatsAppSend,
    userBookingRequestCancelCookWhatsAppSend,
    userBookingRequestCancelWhatsAppSend,
    userBookingRequestCreateWhatsAppSend,
    userBookingRequestOfferAcceptCookWhatsAppSend,
    userBookingRequestOfferAcceptWhatsAppSend,
    userBookingRequestUpdateCookWhatsAppSend,
} from './bookingRequestLifecycleWhatsApp';
import { bookingRequestOfferPaymentPdfFilenames, bookingRequestOfferPaymentPdfsCreate } from './bookingRequestOfferPaymentPdfsCreate';
import { emailAddressPresent } from './emailAddressPresent';

type EmailUser = {
    userId: string;
    emailAddress: string;
    firstName: string;
    locale: Locale;
    timeZone: string;
    notificationSettings: UserNotificationSettingsStored;
};

function sendUserEmail(
    serverRuntime: ServerRuntime,
    label: string,
    entityId: string,
    user: EmailUser,
    purpose: OutboundEmailPurpose,
    audience: NotificationAudience | undefined,
    send: () => Promise<unknown>,
): Promise<void> {
    if (!notificationEmailAllowed(user.notificationSettings, purpose, audience)) {
        return Promise.resolve();
    }
    return sendSafely(serverRuntime, label, entityId, send);
}

async function sendSafely(serverRuntime: ServerRuntime, label: string, entityId: string, send: () => Promise<unknown>): Promise<void> {
    try {
        await send();
    } catch (error) {
        serverRuntime.log.error(
            error instanceof Error ? new Error(`${label}: email failed for ${entityId}: ${error.message}`, { cause: error }) : error,
            null,
        );
    }
}

async function usersByIdsFind(serverRuntime: ServerRuntime, userIds: string[]): Promise<Map<string, EmailUser>> {
    const uniqueIds = [...new Set(userIds.filter((id) => id.length > 0))];
    if (uniqueIds.length === 0) {
        return new Map();
    }
    const rows = await serverRuntime.db
        .select({
            userId: users.userId,
            emailAddress: users.emailAddress,
            firstName: users.firstName,
            locale: users.locale,
            timeZone: users.timeZone,
            notificationSettings: users.notificationSettings,
        })
        .from(users)
        .where(inArray(users.userId, uniqueIds));
    const map = new Map<string, EmailUser>();
    for (const row of rows) {
        const withEmail = emailAddressPresent(row);
        if (withEmail) {
            map.set(withEmail.userId, withEmail);
        }
    }
    return map;
}

function priceClassLabelResolve(priceClassType: string | null | undefined, locale: Locale): string {
    if (priceClassType === 'LOW' || priceClassType === 'MEDIUM' || priceClassType === 'HIGH') {
        return bookingRequestPriceClassLabel(priceClassType, locale);
    }
    return { de: 'Individuell', en: 'Custom' }[locale];
}

/**
 * Customer receipt after booking-request create. Failures are logged and do not undo the write.
 */
export async function userBookingRequestCreateEmailSend(
    serverRuntime: ServerRuntime,
    args: { bookingRequestId: string; userId: string },
): Promise<void> {
    const [[bookingRequest], participantRows, userMap] = await Promise.all([
        serverRuntime.db.select().from(bookingRequests).where(eq(bookingRequests.bookingRequestId, args.bookingRequestId)).limit(1),
        serverRuntime.db
            .select({ type: bookingRequestParticipants.type })
            .from(bookingRequestParticipants)
            .where(eq(bookingRequestParticipants.bookingRequestId, args.bookingRequestId)),
        usersByIdsFind(serverRuntime, [args.userId]),
    ]);
    const customer = userMap.get(args.userId);
    if (!bookingRequest || !customer) {
        return;
    }

    const locale = customer.locale;
    const webPageUrl = environmentVariables.webPageUrl;
    const adultCount = participantRows.filter((row) => row.type === 'ADULT').length;
    const discountedCount = participantRows.filter((row) => row.type === 'DISCOUNTED').length;

    await Promise.all([
        sendUserEmail(
            serverRuntime,
            'userBookingRequestCreateEmailSend',
            args.bookingRequestId,
            customer,
            'BOOKING_REQUEST_CREATED',
            undefined,
            () =>
                serverRuntime.email.send({
                    to: customer.emailAddress,
                    subject: userBookingRequestCreateForCustomerEmailSubject(locale),
                    react: UserBookingRequestCreateForCustomerEmail({
                        locale,
                        timeZone: customer.timeZone,
                        webPageUrl,
                        recipientFirstName: customer.firstName,
                        bookingRequestId: bookingRequest.bookingRequestId,
                        occasion: bookingRequest.occasion,
                        dateTime: bookingRequest.dateTime,
                        address: bookingRequest.exactEventAddress.displayText,
                        priceClassLabel: priceClassLabelResolve(bookingRequest.priceClassType, locale),
                        adultCount,
                        discountedCount,
                        requestUrl: bookingRequestEmailCustomerRequestUrl(webPageUrl, bookingRequest.bookingRequestId),
                    }),
                    purpose: 'BOOKING_REQUEST_CREATED',
                    locale,
                    relatedEntity: { type: 'BOOKING_REQUEST', id: bookingRequest.bookingRequestId },
                    userId: customer.userId,
                }),
        ),
        userBookingRequestCreateWhatsAppSend(serverRuntime, {
            bookingRequestId: bookingRequest.bookingRequestId,
            customerUserId: args.userId,
            dateTime: bookingRequest.dateTime,
        }),
    ]);
}

/**
 * Notify cooks with open offers that the customer changed the request (re-accept needed).
 */
export async function userBookingRequestUpdateEmailSend(
    serverRuntime: ServerRuntime,
    args: {
        bookingRequestId: string;
        customerUserId: string;
        cookIds: string[];
        offerIdsByCookId: Map<string, string>;
        /** Cooks who already received an evening calendar file. They are asked to remove the old evening. */
        cookIdsWithSavedEvent?: readonly string[];
    },
): Promise<void> {
    if (args.cookIds.length === 0) {
        return;
    }
    const userMap = await usersByIdsFind(serverRuntime, [args.customerUserId, ...args.cookIds]);
    const customer = userMap.get(args.customerUserId);
    if (!customer) {
        return;
    }

    const webPageUrl = environmentVariables.webPageUrl;

    await Promise.all(
        args.cookIds.map(async (cookId) => {
            const cook = userMap.get(cookId);
            const offerId = args.offerIdsByCookId.get(cookId);
            if (!cook || !offerId) {
                return;
            }
            const locale = cook.locale;
            await Promise.all([
                sendUserEmail(serverRuntime, 'userBookingRequestUpdateEmailSend', offerId, cook, 'BOOKING_REQUEST_UPDATED', undefined, () =>
                    serverRuntime.email.send({
                        to: cook.emailAddress,
                        subject: userBookingRequestUpdateForCookEmailSubject(locale),
                        react: UserBookingRequestUpdateForCookEmail({
                            locale,
                            webPageUrl,
                            recipientFirstName: cook.firstName,
                            customerFirstName: customer.firstName,
                            offerUrl: bookingRequestEmailCookOfferUrl(webPageUrl, offerId),
                            dateNoLongerConfirmed: args.cookIdsWithSavedEvent?.includes(cookId) === true,
                        }),
                        purpose: 'BOOKING_REQUEST_UPDATED',
                        locale,
                        relatedEntity: { type: 'BOOKING_REQUEST', id: args.bookingRequestId },
                        userId: cook.userId,
                    }),
                ),
                userBookingRequestUpdateCookWhatsAppSend(serverRuntime, {
                    bookingRequestId: args.bookingRequestId,
                    cookUserId: cookId,
                    customerFirstName: customer.firstName,
                    bookingRequestOfferId: offerId,
                }),
            ]);
        }),
    );
}

/**
 * Customer + cooks who had offers after a request cancel.
 */
export async function userBookingRequestCancelEmailSend(
    serverRuntime: ServerRuntime,
    args: {
        bookingRequestId: string;
        customerUserId: string;
        cookIds: string[];
        reason: string;
        /** Present when an evening calendar file was already sent. */
        savedEvent?: { cookId: string; customerHadFile: boolean };
    },
): Promise<void> {
    const userMap = await usersByIdsFind(serverRuntime, [args.customerUserId, ...args.cookIds]);
    const customer = userMap.get(args.customerUserId);
    const webPageUrl = environmentVariables.webPageUrl;

    const tasks: Promise<void>[] = [];
    if (customer) {
        const customerLocale = customer.locale;
        tasks.push(
            sendUserEmail(
                serverRuntime,
                'userBookingRequestCancelEmailSend.customer',
                args.bookingRequestId,
                customer,
                'BOOKING_REQUEST_CANCELED',
                'CUSTOMER',
                () =>
                    serverRuntime.email.send({
                        to: customer.emailAddress,
                        subject: userBookingRequestCancelForCustomerEmailSubject(customerLocale),
                        react: UserBookingRequestCancelForCustomerEmail({
                            locale: customerLocale,
                            webPageUrl,
                            recipientFirstName: customer.firstName,
                            removeSavedEvent: args.savedEvent?.customerHadFile === true,
                        }),
                        purpose: 'BOOKING_REQUEST_CANCELED',
                        locale: customerLocale,
                        relatedEntity: { type: 'BOOKING_REQUEST', id: args.bookingRequestId },
                        userId: customer.userId,
                    }),
            ),
            userBookingRequestCancelWhatsAppSend(serverRuntime, {
                bookingRequestId: args.bookingRequestId,
                customerUserId: args.customerUserId,
            }),
        );
    }

    for (const cookId of args.cookIds) {
        const cook = userMap.get(cookId);
        if (!cook) continue;
        const cookLocale = cook.locale;
        tasks.push(
            sendUserEmail(
                serverRuntime,
                'userBookingRequestCancelEmailSend.cook',
                args.bookingRequestId,
                cook,
                'BOOKING_REQUEST_CANCELED',
                'COOK',
                () =>
                    serverRuntime.email.send({
                        to: cook.emailAddress,
                        subject: userBookingRequestCancelForCookEmailSubject(cookLocale),
                        react: UserBookingRequestCancelForCookEmail({
                            locale: cookLocale,
                            webPageUrl,
                            recipientFirstName: cook.firstName,
                            reason: args.reason,
                            removeSavedEvent: args.savedEvent?.cookId === cookId,
                        }),
                        purpose: 'BOOKING_REQUEST_CANCELED',
                        locale: cookLocale,
                        relatedEntity: { type: 'BOOKING_REQUEST', id: args.bookingRequestId },
                        userId: cook.userId,
                    }),
            ),
            userBookingRequestCancelCookWhatsAppSend(serverRuntime, {
                bookingRequestId: args.bookingRequestId,
                cookUserId: cookId,
                customerFirstName: customer?.firstName ?? 'Customer',
            }),
        );
    }

    await Promise.all(tasks);
}

/**
 * Customer notification when a cook creates an offer.
 */
export async function cookBookingRequestOfferCreateEmailSend(
    serverRuntime: ServerRuntime,
    args: {
        bookingRequestOfferId: string;
        bookingRequestId: string;
        customerUserId: string;
        cookId: string;
        occasion: string;
        dateTime: Date;
        address: string;
        suggestedMenuTitles: string[];
    },
): Promise<void> {
    const userMap = await usersByIdsFind(serverRuntime, [args.customerUserId, args.cookId]);
    const customer = userMap.get(args.customerUserId);
    const cook = userMap.get(args.cookId);
    if (!customer || !cook) {
        return;
    }

    const locale = customer.locale;
    const webPageUrl = environmentVariables.webPageUrl;

    await Promise.all([
        sendUserEmail(
            serverRuntime,
            'cookBookingRequestOfferCreateEmailSend',
            args.bookingRequestOfferId,
            customer,
            'BOOKING_REQUEST_OFFER_CREATED',
            undefined,
            () =>
                serverRuntime.email.send({
                    to: customer.emailAddress,
                    subject: cookBookingRequestOfferCreateForCustomerEmailSubject(locale),
                    react: CookBookingRequestOfferCreateForCustomerEmail({
                        locale,
                        timeZone: customer.timeZone,
                        webPageUrl,
                        recipientFirstName: customer.firstName,
                        cookFirstName: cook.firstName,
                        bookingRequestId: args.bookingRequestId,
                        occasion: args.occasion,
                        dateTime: args.dateTime,
                        address: args.address,
                        suggestedMenuTitles: args.suggestedMenuTitles,
                        offerUrl: bookingRequestEmailCustomerOfferUrl(webPageUrl, args.bookingRequestId, args.bookingRequestOfferId),
                    }),
                    purpose: 'BOOKING_REQUEST_OFFER_CREATED',
                    locale,
                    relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: args.bookingRequestOfferId },
                    userId: customer.userId,
                }),
        ),
        cookBookingRequestOfferCreateWhatsAppSend(serverRuntime, {
            bookingRequestOfferId: args.bookingRequestOfferId,
            bookingRequestId: args.bookingRequestId,
            customerUserId: args.customerUserId,
            cookFirstName: cook.firstName,
            dateTime: args.dateTime,
            menusLabel: args.suggestedMenuTitles.join(', '),
        }),
    ]);
}

/**
 * Customer notification when cook updates suggested menus on an offer.
 */
export async function cookBookingRequestOfferSuggestedMenusUpdateEmailSend(
    serverRuntime: ServerRuntime,
    args: { bookingRequestOfferId: string; bookingRequestId: string; customerUserId: string; cookId: string },
): Promise<void> {
    const userMap = await usersByIdsFind(serverRuntime, [args.customerUserId, args.cookId]);
    const customer = userMap.get(args.customerUserId);
    const cook = userMap.get(args.cookId);
    if (!customer || !cook) {
        return;
    }

    const locale = customer.locale;
    const webPageUrl = environmentVariables.webPageUrl;

    await Promise.all([
        sendUserEmail(
            serverRuntime,
            'cookBookingRequestOfferSuggestedMenusUpdateEmailSend',
            args.bookingRequestOfferId,
            customer,
            'BOOKING_REQUEST_OFFER_MENU_UPDATED',
            undefined,
            () =>
                serverRuntime.email.send({
                    to: customer.emailAddress,
                    subject: cookBookingRequestOfferSuggestedMenusUpdateForCustomerEmailSubject(locale),
                    react: CookBookingRequestOfferSuggestedMenusUpdateForCustomerEmail({
                        locale,
                        webPageUrl,
                        recipientFirstName: customer.firstName,
                        cookFirstName: cook.firstName,
                        bookingRequestId: args.bookingRequestId,
                        offerUrl: bookingRequestEmailCustomerOfferUrl(
                            webPageUrl,
                            args.bookingRequestId,
                            args.bookingRequestOfferId,
                            'offer',
                        ),
                    }),
                    purpose: 'BOOKING_REQUEST_OFFER_MENU_UPDATED',
                    locale,
                    relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: args.bookingRequestOfferId },
                    userId: customer.userId,
                }),
        ),
        cookBookingRequestOfferSuggestedMenusUpdateWhatsAppSend(serverRuntime, {
            bookingRequestOfferId: args.bookingRequestOfferId,
            bookingRequestId: args.bookingRequestId,
            customerUserId: args.customerUserId,
            cookFirstName: cook.firstName,
        }),
    ]);
}

/**
 * Chosen cook + not-chosen sibling cooks after customer accept.
 */
export async function userBookingRequestOfferAcceptEmailSend(
    serverRuntime: ServerRuntime,
    args: {
        bookingRequestOfferId: string;
        bookingRequestId: string;
        customerUserId: string;
        cookId: string;
        siblingCookIds: string[];
    },
): Promise<void> {
    const userMap = await usersByIdsFind(serverRuntime, [args.customerUserId, args.cookId, ...args.siblingCookIds]);
    const customer = userMap.get(args.customerUserId);
    const cook = userMap.get(args.cookId);
    if (!customer || !cook) {
        return;
    }

    const webPageUrl = environmentVariables.webPageUrl;
    const cookLocale = cook.locale;
    const [request] = await serverRuntime.db
        .select({
            occasion: bookingRequests.occasion,
            dateTime: bookingRequests.dateTime,
            exactEventAddress: bookingRequests.exactEventAddress,
        })
        .from(bookingRequests)
        .where(eq(bookingRequests.bookingRequestId, args.bookingRequestId))
        .limit(1);
    if (!request) {
        return;
    }
    const calendarFile = await bookingEventCalendarAttachment(serverRuntime, {
        bookingRequestId: args.bookingRequestId,
        bookingRequestOfferId: args.bookingRequestOfferId,
        locale: cookLocale,
        timeZone: cook.timeZone,
        peerName: customer.firstName,
        audience: 'cook',
    });

    const tasks: Promise<void>[] = [
        sendUserEmail(
            serverRuntime,
            'userBookingRequestOfferAcceptEmailSend.cook',
            args.bookingRequestOfferId,
            cook,
            'BOOKING_REQUEST_OFFER_ACCEPTED',
            undefined,
            () =>
                serverRuntime.email.send({
                    to: cook.emailAddress,
                    subject: userBookingRequestOfferAcceptForCookEmailSubject(cookLocale),
                    react: UserBookingRequestOfferAcceptForCookEmail({
                        locale: cookLocale,
                        timeZone: cook.timeZone,
                        webPageUrl,
                        recipientFirstName: cook.firstName,
                        customerFirstName: customer.firstName,
                        occasion: request.occasion,
                        startAt: request.dateTime,
                        venue: request.exactEventAddress.displayText,
                        chatUrl: bookingRequestEmailCookOfferUrl(webPageUrl, args.bookingRequestOfferId, 'chat'),
                    }),
                    purpose: 'BOOKING_REQUEST_OFFER_ACCEPTED',
                    locale: cookLocale,
                    relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: args.bookingRequestOfferId },
                    userId: cook.userId,
                    attachments: calendarFile ? [calendarFile] : undefined,
                }),
        ),
    ];

    for (const siblingCookId of args.siblingCookIds) {
        const sibling = userMap.get(siblingCookId);
        if (!sibling) continue;
        const siblingLocale = sibling.locale;
        tasks.push(
            sendUserEmail(
                serverRuntime,
                'userBookingRequestOfferAcceptEmailSend.notChosen',
                args.bookingRequestOfferId,
                sibling,
                'BOOKING_REQUEST_OFFER_NOT_CHOSEN',
                undefined,
                () =>
                    serverRuntime.email.send({
                        to: sibling.emailAddress,
                        subject: userBookingRequestOfferAcceptForNotChosenCookEmailSubject(siblingLocale),
                        react: UserBookingRequestOfferAcceptForNotChosenCookEmail({
                            locale: siblingLocale,
                            webPageUrl,
                            recipientFirstName: sibling.firstName,
                            customerFirstName: customer.firstName,
                        }),
                        purpose: 'BOOKING_REQUEST_OFFER_NOT_CHOSEN',
                        locale: siblingLocale,
                        relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: args.bookingRequestOfferId },
                        userId: sibling.userId,
                    }),
            ),
        );
    }

    await Promise.all([
        ...tasks,
        userBookingRequestOfferAcceptWhatsAppSend(serverRuntime, {
            bookingRequestOfferId: args.bookingRequestOfferId,
            bookingRequestId: args.bookingRequestId,
            customerUserId: args.customerUserId,
            cookFirstName: cook.firstName,
        }),
        userBookingRequestOfferAcceptCookWhatsAppSend(serverRuntime, {
            bookingRequestOfferId: args.bookingRequestOfferId,
            bookingRequestId: args.bookingRequestId,
            cookUserId: args.cookId,
            customerFirstName: customer.firstName,
        }),
    ]);
}

/**
 * Cook notification when customer declines an offer.
 */
export async function userBookingRequestOfferDeclineEmailSend(
    serverRuntime: ServerRuntime,
    args: { bookingRequestOfferId: string; customerUserId: string; cookId: string; reason: string },
): Promise<void> {
    const userMap = await usersByIdsFind(serverRuntime, [args.customerUserId, args.cookId]);
    const customer = userMap.get(args.customerUserId);
    const cook = userMap.get(args.cookId);
    if (!customer || !cook) {
        return;
    }

    const locale = cook.locale;
    const webPageUrl = environmentVariables.webPageUrl;

    await sendUserEmail(
        serverRuntime,
        'userBookingRequestOfferDeclineEmailSend',
        args.bookingRequestOfferId,
        cook,
        'BOOKING_REQUEST_OFFER_DECLINED',
        undefined,
        () =>
            serverRuntime.email.send({
                to: cook.emailAddress,
                subject: userBookingRequestOfferDeclineForCookEmailSubject(locale),
                react: UserBookingRequestOfferDeclineForCookEmail({
                    locale,
                    webPageUrl,
                    recipientFirstName: cook.firstName,
                    customerFirstName: customer.firstName,
                    reason: args.reason,
                }),
                purpose: 'BOOKING_REQUEST_OFFER_DECLINED',
                locale,
                relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: args.bookingRequestOfferId },
                userId: cook.userId,
            }),
    );
}

/**
 * Customer already has an evening file, and an admin date change cleared cook acceptance.
 */
export async function bookingEventCalendarDateMovedEmailSend(
    serverRuntime: ServerRuntime,
    args: { bookingRequestId: string; customerUserId: string },
): Promise<void> {
    const userMap = await usersByIdsFind(serverRuntime, [args.customerUserId]);
    const customer = userMap.get(args.customerUserId);
    if (!customer) return;
    const webPageUrl = environmentVariables.webPageUrl;
    await sendUserEmail(
        serverRuntime,
        'bookingEventCalendarDateMovedEmailSend',
        args.bookingRequestId,
        customer,
        'BOOKING_EVENT_CALENDAR',
        'CUSTOMER',
        () =>
            serverRuntime.email.send({
                to: customer.emailAddress,
                subject: bookingEventCalendarDateMovedEmailSubject(customer.locale),
                react: BookingEventCalendarDateMovedEmail({
                    locale: customer.locale,
                    webPageUrl,
                    recipientFirstName: customer.firstName,
                    requestUrl: bookingRequestEmailCustomerRequestUrl(webPageUrl, args.bookingRequestId),
                }),
                purpose: 'BOOKING_EVENT_CALENDAR',
                locale: customer.locale,
                relatedEntity: { type: 'BOOKING_REQUEST', id: args.bookingRequestId },
                userId: customer.userId,
            }),
    );
}

/**
 * Cook accept restored a dual-accepted evening. Sends a fresh calendar file.
 * The customer receives it only when they already had one.
 */
export async function bookingEventCalendarRestoredEmailSend(
    serverRuntime: ServerRuntime,
    args: {
        bookingRequestId: string;
        bookingRequestOfferId: string;
        customerUserId: string;
        cookId: string;
        customerHadFile: boolean;
    },
): Promise<void> {
    const userMap = await usersByIdsFind(serverRuntime, [args.customerUserId, args.cookId]);
    const customer = userMap.get(args.customerUserId);
    const cook = userMap.get(args.cookId);
    if (!customer || !cook) return;

    const [request] = await serverRuntime.db
        .select({ occasion: bookingRequests.occasion, dateTime: bookingRequests.dateTime })
        .from(bookingRequests)
        .where(eq(bookingRequests.bookingRequestId, args.bookingRequestId))
        .limit(1);
    if (!request) return;

    const webPageUrl = environmentVariables.webPageUrl;
    const tasks: Promise<void>[] = [
        (async () => {
            const calendarFile = await bookingEventCalendarAttachment(serverRuntime, {
                bookingRequestId: args.bookingRequestId,
                bookingRequestOfferId: args.bookingRequestOfferId,
                locale: cook.locale,
                timeZone: cook.timeZone,
                peerName: customer.firstName,
                audience: 'cook',
            });
            await sendUserEmail(
                serverRuntime,
                'bookingEventCalendarRestoredEmailSend.cook',
                args.bookingRequestOfferId,
                cook,
                'BOOKING_EVENT_CALENDAR',
                'COOK',
                () =>
                    serverRuntime.email.send({
                        to: cook.emailAddress,
                        subject: bookingEventCalendarRestoredEmailSubject(cook.locale),
                        react: BookingEventCalendarRestoredEmail({
                            locale: cook.locale,
                            timeZone: cook.timeZone,
                            webPageUrl,
                            recipientFirstName: cook.firstName,
                            occasion: request.occasion,
                            startAt: request.dateTime,
                            bookingUrl: bookingRequestEmailCookOfferUrl(webPageUrl, args.bookingRequestOfferId, 'offer'),
                        }),
                        purpose: 'BOOKING_EVENT_CALENDAR',
                        locale: cook.locale,
                        relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: args.bookingRequestOfferId },
                        userId: cook.userId,
                        attachments: calendarFile ? [calendarFile] : undefined,
                    }),
            );
        })(),
    ];

    if (args.customerHadFile) {
        tasks.push(
            (async () => {
                const calendarFile = await bookingEventCalendarAttachment(serverRuntime, {
                    bookingRequestId: args.bookingRequestId,
                    bookingRequestOfferId: args.bookingRequestOfferId,
                    locale: customer.locale,
                    timeZone: customer.timeZone,
                    peerName: cook.firstName,
                    audience: 'customer',
                });
                await sendUserEmail(
                    serverRuntime,
                    'bookingEventCalendarRestoredEmailSend.customer',
                    args.bookingRequestOfferId,
                    customer,
                    'BOOKING_EVENT_CALENDAR',
                    'CUSTOMER',
                    () =>
                        serverRuntime.email.send({
                            to: customer.emailAddress,
                            subject: bookingEventCalendarRestoredEmailSubject(customer.locale),
                            react: BookingEventCalendarRestoredEmail({
                                locale: customer.locale,
                                timeZone: customer.timeZone,
                                webPageUrl,
                                recipientFirstName: customer.firstName,
                                occasion: request.occasion,
                                startAt: request.dateTime,
                                bookingUrl: bookingRequestEmailCustomerRequestUrl(webPageUrl, args.bookingRequestId),
                            }),
                            purpose: 'BOOKING_EVENT_CALENDAR',
                            locale: customer.locale,
                            relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: args.bookingRequestOfferId },
                            userId: customer.userId,
                            attachments: calendarFile ? [calendarFile] : undefined,
                        }),
                );
            })(),
        );
    }

    await Promise.all(tasks);
}

/**
 * Customer booking confirmation after payment advances (SETUP / PAYED) or €0 accept.
 */
export async function bookingRequestOfferPaymentConfirmedEmailSend(
    serverRuntime: ServerRuntime,
    args: {
        offer: Pick<BookingRequestOffer, 'bookingRequestOfferId' | 'cookId'>;
        bookingRequest: Pick<BookingRequest, 'bookingRequestId' | 'userId'>;
    },
): Promise<void> {
    const userMap = await usersByIdsFind(serverRuntime, [args.bookingRequest.userId, args.offer.cookId]);
    const customer = userMap.get(args.bookingRequest.userId);
    const cook = userMap.get(args.offer.cookId);
    if (!customer || !cook) {
        return;
    }

    const locale = customer.locale;
    const webPageUrl = environmentVariables.webPageUrl;
    const [request] = await serverRuntime.db
        .select({ dateTime: bookingRequests.dateTime, occasion: bookingRequests.occasion })
        .from(bookingRequests)
        .where(eq(bookingRequests.bookingRequestId, args.bookingRequest.bookingRequestId))
        .limit(1);
    if (!request) {
        return;
    }
    const [offerRow] = await serverRuntime.db
        .select({ paymentStatus: bookingRequestOffers.paymentStatus })
        .from(bookingRequestOffers)
        .where(eq(bookingRequestOffers.bookingRequestOfferId, args.offer.bookingRequestOfferId))
        .limit(1);
    const pdfs =
        offerRow?.paymentStatus === 'PAYED'
            ? await bookingRequestOfferPaymentPdfsCreate(args.offer.bookingRequestOfferId, serverRuntime)
            : null;
    const cookStatement = pdfs?.cookStatement ?? null;
    const calendarFile = await bookingEventCalendarAttachment(serverRuntime, {
        bookingRequestId: args.bookingRequest.bookingRequestId,
        bookingRequestOfferId: args.offer.bookingRequestOfferId,
        locale,
        timeZone: customer.timeZone,
        peerName: cook.firstName,
        audience: 'customer',
    });
    const customerAttachments = [
        ...(calendarFile ? [calendarFile] : []),
        ...(pdfs?.customerReceipt
            ? [
                  {
                      filename: bookingRequestOfferPaymentPdfFilenames.receipt,
                      content: pdfs.customerReceipt.content,
                      mediaType: bookingRequestOfferPaymentPdfFilenames.mediaType,
                      fileUploadId: pdfs.customerReceipt.fileUploadId,
                  },
              ]
            : []),
    ];

    await Promise.all([
        sendUserEmail(
            serverRuntime,
            'bookingRequestOfferPaymentConfirmedEmailSend',
            args.offer.bookingRequestOfferId,
            customer,
            'BOOKING_REQUEST_OFFER_PAYMENT_CONFIRMED',
            undefined,
            () =>
                serverRuntime.email.send({
                    to: customer.emailAddress,
                    subject: bookingRequestOfferPaymentFinalizeForCustomerEmailSubject(locale),
                    react: BookingRequestOfferPaymentFinalizeForCustomerEmail({
                        locale,
                        timeZone: customer.timeZone,
                        webPageUrl,
                        recipientFirstName: customer.firstName,
                        cookFirstName: cook.firstName,
                        startAt: request.dateTime,
                        bookingRequestId: args.bookingRequest.bookingRequestId,
                        receiptAttached: pdfs?.customerReceipt != null,
                        chatUrl: bookingRequestEmailCustomerOfferUrl(
                            webPageUrl,
                            args.bookingRequest.bookingRequestId,
                            args.offer.bookingRequestOfferId,
                            'chat',
                        ),
                    }),
                    purpose: 'BOOKING_REQUEST_OFFER_PAYMENT_CONFIRMED',
                    locale,
                    relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: args.offer.bookingRequestOfferId },
                    userId: customer.userId,
                    attachments: customerAttachments.length > 0 ? customerAttachments : undefined,
                }),
        ),
        cookStatement
            ? sendUserEmail(
                  serverRuntime,
                  'bookingRequestOfferPaymentStatementForCookEmailSend',
                  args.offer.bookingRequestOfferId,
                  cook,
                  'BOOKING_REQUEST_OFFER_PAYMENT_STATEMENT',
                  undefined,
                  () =>
                      serverRuntime.email.send({
                          to: cook.emailAddress,
                          subject: bookingRequestOfferPaymentStatementForCookEmailSubject(cook.locale),
                          react: BookingRequestOfferPaymentStatementForCookEmail({
                              locale: cook.locale,
                              webPageUrl,
                              recipientFirstName: cook.firstName,
                              bookingRequestId: args.bookingRequest.bookingRequestId,
                              bookingRequestOfferId: args.offer.bookingRequestOfferId,
                              occasion: request.occasion,
                          }),
                          purpose: 'BOOKING_REQUEST_OFFER_PAYMENT_STATEMENT',
                          locale: cook.locale,
                          relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: args.offer.bookingRequestOfferId },
                          userId: cook.userId,
                          attachments: [
                              {
                                  filename: bookingRequestOfferPaymentPdfFilenames.statement,
                                  content: cookStatement.content,
                                  mediaType: bookingRequestOfferPaymentPdfFilenames.mediaType,
                                  fileUploadId: cookStatement.fileUploadId,
                              },
                          ],
                      }),
              )
            : Promise.resolve(),
        bookingRequestOfferPaymentConfirmedWhatsAppSend(serverRuntime, {
            bookingRequestOfferId: args.offer.bookingRequestOfferId,
            bookingRequestId: args.bookingRequest.bookingRequestId,
            customerUserId: args.bookingRequest.userId,
            cookFirstName: cook.firstName,
        }),
    ]);
}

/**
 * Reminds the customer that the saved card will be charged soon.
 */
export async function bookingRequestOfferPullPaymentAnnouncementEmailSend(
    serverRuntime: ServerRuntime,
    args: {
        bookingRequestOfferId: string;
        bookingRequestId: string;
        customerUserId: string;
        totalCentsCustomer: number;
        pullPaymentDate: Date;
    },
): Promise<void> {
    const userMap = await usersByIdsFind(serverRuntime, [args.customerUserId]);
    const customer = userMap.get(args.customerUserId);
    if (!customer) {
        return;
    }

    const locale = customer.locale;
    const webPageUrl = environmentVariables.webPageUrl;

    const totalLabel = formatCurrency(args.totalCentsCustomer, { locale });

    await Promise.all([
        sendUserEmail(
            serverRuntime,
            'bookingRequestOfferPullPaymentAnnouncementEmailSend',
            args.bookingRequestOfferId,
            customer,
            'BOOKING_REQUEST_OFFER_PULL_PAYMENT_ANNOUNCEMENT',
            undefined,
            () =>
                serverRuntime.email.send({
                    to: customer.emailAddress,
                    subject: bookingRequestOfferPullPaymentAnnouncementForCustomerEmailSubject(locale),
                    react: BookingRequestOfferPullPaymentAnnouncementForCustomerEmail({
                        locale,
                        timeZone: customer.timeZone,
                        webPageUrl,
                        recipientFirstName: customer.firstName,
                        bookingRequestId: args.bookingRequestId,
                        totalCentsCustomer: args.totalCentsCustomer,
                        pullPaymentDate: args.pullPaymentDate,
                        requestUrl: bookingRequestEmailCustomerRequestUrl(webPageUrl, args.bookingRequestId),
                    }),
                    purpose: 'BOOKING_REQUEST_OFFER_PULL_PAYMENT_ANNOUNCEMENT',
                    locale,
                    relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: args.bookingRequestOfferId },
                    userId: customer.userId,
                }),
        ),
        bookingRequestOfferPullPaymentAnnouncementWhatsAppSend(serverRuntime, {
            bookingRequestOfferId: args.bookingRequestOfferId,
            bookingRequestId: args.bookingRequestId,
            customerUserId: args.customerUserId,
            totalLabel,
        }),
    ]);
}

export async function bookingRequestOfferParticipantAmendmentCreateEmailSend(
    serverRuntime: ServerRuntime,
    args: {
        bookingRequest: BookingRequest;
        offer: BookingRequestOffer;
        customer: EmailUser;
        cook: EmailUser;
    },
): Promise<void> {
    const locale = args.cook.locale;
    const webPageUrl = environmentVariables.webPageUrl;
    await sendUserEmail(
        serverRuntime,
        'bookingRequestOfferParticipantAmendmentCreateEmailSend',
        args.offer.bookingRequestOfferId,
        args.cook,
        'BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT_REQUESTED',
        undefined,
        () =>
            serverRuntime.email.send({
                to: args.cook.emailAddress,
                subject: userBookingRequestOfferParticipantAmendmentCreateForCookEmailSubject(locale),
                react: UserBookingRequestOfferParticipantAmendmentCreateForCookEmail({
                    locale,
                    webPageUrl,
                    recipientFirstName: args.cook.firstName,
                    customerFirstName: args.customer.firstName,
                    offerUrl: bookingRequestEmailCookOfferUrl(webPageUrl, args.offer.bookingRequestOfferId, 'offer'),
                }),
                purpose: 'BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT_REQUESTED',
                locale,
                relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: args.offer.bookingRequestOfferId },
                userId: args.cook.userId,
            }),
    );
}

export async function bookingRequestOfferParticipantAmendmentAcceptEmailSend(
    serverRuntime: ServerRuntime,
    args: {
        bookingRequest: BookingRequest;
        offer: BookingRequestOffer;
        customer: EmailUser;
        cook: EmailUser;
        customerDeltaCents: number;
        giftCardDeltaCents: number;
        paymentStatus: string;
        pendingDeltaPaymentDue: boolean;
        venueDisplayText?: string | null;
    },
): Promise<void> {
    const locale = args.customer.locale;
    const webPageUrl = environmentVariables.webPageUrl;
    const offerUrl = bookingRequestEmailCustomerOfferUrl(
        webPageUrl,
        args.bookingRequest.bookingRequestId,
        args.offer.bookingRequestOfferId,
    );
    const checkoutUrl = `${offerUrl}/checkout`;
    await sendUserEmail(
        serverRuntime,
        'bookingRequestOfferParticipantAmendmentAcceptEmailSend',
        args.offer.bookingRequestOfferId,
        args.customer,
        'BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT_ACCEPTED',
        undefined,
        () =>
            serverRuntime.email.send({
                to: args.customer.emailAddress,
                subject: cookBookingRequestOfferParticipantAmendmentAcceptForCustomerEmailSubject(locale),
                react: CookBookingRequestOfferParticipantAmendmentAcceptForCustomerEmail({
                    locale,
                    webPageUrl,
                    recipientFirstName: args.customer.firstName,
                    cookFirstName: args.cook.firstName,
                    offerUrl,
                    checkoutUrl,
                    customerDeltaCents: args.customerDeltaCents,
                    giftCardDeltaCents: args.giftCardDeltaCents,
                    paymentStatus: args.paymentStatus,
                    pendingDeltaPaymentDue: args.pendingDeltaPaymentDue,
                    venueDisplayText: args.venueDisplayText,
                }),
                purpose: 'BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT_ACCEPTED',
                locale,
                relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: args.offer.bookingRequestOfferId },
                userId: args.customer.userId,
            }),
    );
}

export async function bookingRequestOfferParticipantAmendmentDeclineEmailSend(
    serverRuntime: ServerRuntime,
    args: {
        bookingRequest: BookingRequest;
        offer: BookingRequestOffer;
        customer: EmailUser;
        cook: EmailUser;
    },
): Promise<void> {
    const locale = args.customer.locale;
    const webPageUrl = environmentVariables.webPageUrl;
    await sendUserEmail(
        serverRuntime,
        'bookingRequestOfferParticipantAmendmentDeclineEmailSend',
        args.offer.bookingRequestOfferId,
        args.customer,
        'BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT_DECLINED',
        undefined,
        () =>
            serverRuntime.email.send({
                to: args.customer.emailAddress,
                subject: cookBookingRequestOfferParticipantAmendmentDeclineForCustomerEmailSubject(locale),
                react: CookBookingRequestOfferParticipantAmendmentDeclineForCustomerEmail({
                    locale,
                    webPageUrl,
                    recipientFirstName: args.customer.firstName,
                    cookFirstName: args.cook.firstName,
                    offerUrl: bookingRequestEmailCustomerOfferUrl(
                        webPageUrl,
                        args.bookingRequest.bookingRequestId,
                        args.offer.bookingRequestOfferId,
                    ),
                }),
                purpose: 'BOOKING_REQUEST_OFFER_PARTICIPANT_AMENDMENT_DECLINED',
                locale,
                relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: args.offer.bookingRequestOfferId },
                userId: args.customer.userId,
            }),
    );
}
