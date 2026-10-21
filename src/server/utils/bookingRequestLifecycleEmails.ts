import { eq, inArray } from 'drizzle-orm';

import { formatCurrency } from '../../shared';
import { bookingRequestPriceClassLabel } from '../../shared/bookingRequestFormDefaults';
import type { Locale } from '../../shared/locale';
import { bookingRequestParticipants, bookingRequests, users } from '../db/schema';
import type { BookingRequest, BookingRequestOffer } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import {
    bookingRequestEmailCookOfferUrl,
    bookingRequestEmailCustomerOfferUrl,
    bookingRequestEmailCustomerRequestUrl,
} from '../email/components/bookingRequestEmailUrls';
import {
    BookingRequestOfferPaymentFinalizeForCustomerEmail,
    bookingRequestOfferPaymentFinalizeForCustomerEmailSubject,
} from '../email/templates/BookingRequestOfferPaymentFinalizeForCustomerEmail';
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
import { emailAddressPresent } from './emailAddressPresent';

type EmailUser = { userId: string; emailAddress: string; firstName: string; locale: Locale; timeZone: string };

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
        sendSafely(serverRuntime, 'userBookingRequestCreateEmailSend', args.bookingRequestId, () =>
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
    args: { bookingRequestId: string; customerUserId: string; cookIds: string[]; offerIdsByCookId: Map<string, string> },
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
                sendSafely(serverRuntime, 'userBookingRequestUpdateEmailSend', offerId, () =>
                    serverRuntime.email.send({
                        to: cook.emailAddress,
                        subject: userBookingRequestUpdateForCookEmailSubject(locale),
                        react: UserBookingRequestUpdateForCookEmail({
                            locale,
                            webPageUrl,
                            recipientFirstName: cook.firstName,
                            customerFirstName: customer.firstName,
                            offerUrl: bookingRequestEmailCookOfferUrl(webPageUrl, offerId),
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
    args: { bookingRequestId: string; customerUserId: string; cookIds: string[]; reason: string },
): Promise<void> {
    const userMap = await usersByIdsFind(serverRuntime, [args.customerUserId, ...args.cookIds]);
    const customer = userMap.get(args.customerUserId);
    const webPageUrl = environmentVariables.webPageUrl;

    const tasks: Promise<void>[] = [];
    if (customer) {
        const customerLocale = customer.locale;
        tasks.push(
            sendSafely(serverRuntime, 'userBookingRequestCancelEmailSend.customer', args.bookingRequestId, () =>
                serverRuntime.email.send({
                    to: customer.emailAddress,
                    subject: userBookingRequestCancelForCustomerEmailSubject(customerLocale),
                    react: UserBookingRequestCancelForCustomerEmail({
                        locale: customerLocale,
                        webPageUrl,
                        recipientFirstName: customer.firstName,
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
            sendSafely(serverRuntime, 'userBookingRequestCancelEmailSend.cook', args.bookingRequestId, () =>
                serverRuntime.email.send({
                    to: cook.emailAddress,
                    subject: userBookingRequestCancelForCookEmailSubject(cookLocale),
                    react: UserBookingRequestCancelForCookEmail({
                        locale: cookLocale,
                        webPageUrl,
                        recipientFirstName: cook.firstName,
                        reason: args.reason,
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
        sendSafely(serverRuntime, 'cookBookingRequestOfferCreateEmailSend', args.bookingRequestOfferId, () =>
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
        sendSafely(serverRuntime, 'cookBookingRequestOfferSuggestedMenusUpdateEmailSend', args.bookingRequestOfferId, () =>
            serverRuntime.email.send({
                to: customer.emailAddress,
                subject: cookBookingRequestOfferSuggestedMenusUpdateForCustomerEmailSubject(locale),
                react: CookBookingRequestOfferSuggestedMenusUpdateForCustomerEmail({
                    locale,
                    webPageUrl,
                    recipientFirstName: customer.firstName,
                    cookFirstName: cook.firstName,
                    bookingRequestId: args.bookingRequestId,
                    offerUrl: bookingRequestEmailCustomerOfferUrl(webPageUrl, args.bookingRequestId, args.bookingRequestOfferId, 'offer'),
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

    const tasks: Promise<void>[] = [
        sendSafely(serverRuntime, 'userBookingRequestOfferAcceptEmailSend.cook', args.bookingRequestOfferId, () =>
            serverRuntime.email.send({
                to: cook.emailAddress,
                subject: userBookingRequestOfferAcceptForCookEmailSubject(cookLocale),
                react: UserBookingRequestOfferAcceptForCookEmail({
                    locale: cookLocale,
                    webPageUrl,
                    recipientFirstName: cook.firstName,
                    customerFirstName: customer.firstName,
                    chatUrl: bookingRequestEmailCookOfferUrl(webPageUrl, args.bookingRequestOfferId, 'chat'),
                }),
                purpose: 'BOOKING_REQUEST_OFFER_ACCEPTED',
                locale: cookLocale,
                relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: args.bookingRequestOfferId },
                userId: cook.userId,
            }),
        ),
    ];

    for (const siblingCookId of args.siblingCookIds) {
        const sibling = userMap.get(siblingCookId);
        if (!sibling) continue;
        const siblingLocale = sibling.locale;
        tasks.push(
            sendSafely(serverRuntime, 'userBookingRequestOfferAcceptEmailSend.notChosen', args.bookingRequestOfferId, () =>
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

    await sendSafely(serverRuntime, 'userBookingRequestOfferDeclineEmailSend', args.bookingRequestOfferId, () =>
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

    await Promise.all([
        sendSafely(serverRuntime, 'bookingRequestOfferPaymentConfirmedEmailSend', args.offer.bookingRequestOfferId, () =>
            serverRuntime.email.send({
                to: customer.emailAddress,
                subject: bookingRequestOfferPaymentFinalizeForCustomerEmailSubject(locale),
                react: BookingRequestOfferPaymentFinalizeForCustomerEmail({
                    locale,
                    webPageUrl,
                    recipientFirstName: customer.firstName,
                    cookFirstName: cook.firstName,
                    bookingRequestId: args.bookingRequest.bookingRequestId,
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
            }),
        ),
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
        sendSafely(serverRuntime, 'bookingRequestOfferPullPaymentAnnouncementEmailSend', args.bookingRequestOfferId, () =>
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
    await sendSafely(serverRuntime, 'bookingRequestOfferParticipantAmendmentCreateEmailSend', args.offer.bookingRequestOfferId, () =>
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
    await sendSafely(serverRuntime, 'bookingRequestOfferParticipantAmendmentAcceptEmailSend', args.offer.bookingRequestOfferId, () =>
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
    await sendSafely(serverRuntime, 'bookingRequestOfferParticipantAmendmentDeclineEmailSend', args.offer.bookingRequestOfferId, () =>
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
