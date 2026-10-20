import { and, desc, eq } from 'drizzle-orm';

import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests, users } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import { bookingRequestEmailCookOfferUrl, bookingRequestEmailCustomerOfferUrl } from '../email/components/bookingRequestEmailUrls';
import { bookingRequestOfferChatMessageNotifyAttachmentFallback } from '../email/components/BookingRequestOfferChatMessageNotifyBody';
import {
    BookingRequestOfferChatMessageNotifyForCookEmail,
    bookingRequestOfferChatMessageNotifyForCookEmailSubject,
} from '../email/templates/BookingRequestOfferChatMessageNotifyForCookEmail';
import {
    BookingRequestOfferChatMessageNotifyForCustomerEmail,
    bookingRequestOfferChatMessageNotifyForCustomerEmailSubject,
} from '../email/templates/BookingRequestOfferChatMessageNotifyForCustomerEmail';
import { environmentVariables } from '../env/environmentVariablesCreate';
import {
    bookingRequestOfferChatUnreadCookWhatsAppSend,
    bookingRequestOfferChatUnreadCustomerWhatsAppSend,
} from './bookingRequestLifecycleWhatsApp';
import { emailAddressPresent } from './emailAddressPresent';

export type BookingRequestOfferChatMessageNotifyAudience = 'CUSTOMER' | 'COOK';

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

/**
 * Notify customer or cook about a peer offer-chat message. Failures are logged
 * and do not undo the write. Loads the latest peer MESSAGE_SIMPLE body for the
 * bubble preview (attachment-only → locale fallback).
 */
export async function bookingRequestOfferChatMessageNotifyEmailSend(
    serverRuntime: ServerRuntime,
    args: { bookingRequestOfferId: string; audience: BookingRequestOfferChatMessageNotifyAudience },
): Promise<void> {
    const [row] = await serverRuntime.db
        .select({
            bookingRequestOfferId: bookingRequestOffers.bookingRequestOfferId,
            bookingRequestId: bookingRequestOffers.bookingRequestId,
            cookId: bookingRequestOffers.cookId,
            customerUserId: bookingRequests.userId,
            customerEmailAddress: users.emailAddress,
            customerFirstName: users.firstName,
            customerLocale: users.locale,
        })
        .from(bookingRequestOffers)
        .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
        .innerJoin(users, eq(users.userId, bookingRequests.userId))
        .where(eq(bookingRequestOffers.bookingRequestOfferId, args.bookingRequestOfferId))
        .limit(1);

    const customer = emailAddressPresent(
        row
            ? {
                  emailAddress: row.customerEmailAddress,
                  firstName: row.customerFirstName,
                  locale: row.customerLocale,
                  customerUserId: row.customerUserId,
                  bookingRequestOfferId: row.bookingRequestOfferId,
                  bookingRequestId: row.bookingRequestId,
                  cookId: row.cookId,
              }
            : null,
    );
    if (!customer) {
        return;
    }

    const [cookRow] = await serverRuntime.db
        .select({ emailAddress: users.emailAddress, firstName: users.firstName, locale: users.locale })
        .from(users)
        .where(eq(users.userId, customer.cookId))
        .limit(1);

    const cook = emailAddressPresent(cookRow);
    if (!cook) {
        return;
    }

    const peerMessageType = args.audience === 'CUSTOMER' ? 'COOK_MESSAGE_SIMPLE' : 'USER_MESSAGE_SIMPLE';
    const peerMessages = await serverRuntime.db
        .select({ payload: bookingRequestOfferEvents.payload })
        .from(bookingRequestOfferEvents)
        .where(
            and(
                eq(bookingRequestOfferEvents.bookingRequestOfferId, args.bookingRequestOfferId),
                eq(bookingRequestOfferEvents.type, peerMessageType),
            ),
        )
        .orderBy(desc(bookingRequestOfferEvents.createdAt))
        .limit(100);
    const latestPeerMessage = peerMessages.find((message) => {
        const payload = message.payload as { hiddenByAdmin?: boolean };
        return payload.hiddenByAdmin !== true;
    });

    const webPageUrl = environmentVariables.webPageUrl;

    if (args.audience === 'CUSTOMER') {
        const locale = customer.locale;
        const rawBody = latestPeerMessage && 'messageBody' in latestPeerMessage.payload ? latestPeerMessage.payload.messageBody.trim() : '';
        const messageBody = rawBody.length > 0 ? rawBody : bookingRequestOfferChatMessageNotifyAttachmentFallback(locale);
        const chatUrl = bookingRequestEmailCustomerOfferUrl(webPageUrl, customer.bookingRequestId, customer.bookingRequestOfferId, 'chat');

        await Promise.all([
            sendSafely(serverRuntime, 'bookingRequestOfferChatMessageNotifyEmailSend', args.bookingRequestOfferId, () =>
                serverRuntime.email.send({
                    to: customer.emailAddress,
                    subject: bookingRequestOfferChatMessageNotifyForCustomerEmailSubject(locale),
                    react: BookingRequestOfferChatMessageNotifyForCustomerEmail({
                        locale,
                        webPageUrl,
                        recipientFirstName: customer.firstName,
                        senderFirstName: cook.firstName,
                        messageBody,
                        chatUrl,
                    }),
                    purpose: 'BOOKING_REQUEST_OFFER_CHAT_MESSAGE_TO_CUSTOMER',
                    locale,
                    relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: customer.bookingRequestOfferId },
                    userId: customer.customerUserId,
                }),
            ),
            bookingRequestOfferChatUnreadCustomerWhatsAppSend(serverRuntime, {
                bookingRequestOfferId: customer.bookingRequestOfferId,
                bookingRequestId: customer.bookingRequestId,
                customerUserId: customer.customerUserId,
                cookFirstName: cook.firstName,
            }),
        ]);
        return;
    }

    {
        const locale = cook.locale;
        const rawBody = latestPeerMessage && 'messageBody' in latestPeerMessage.payload ? latestPeerMessage.payload.messageBody.trim() : '';
        const messageBody = rawBody.length > 0 ? rawBody : bookingRequestOfferChatMessageNotifyAttachmentFallback(locale);
        const chatUrl = bookingRequestEmailCookOfferUrl(webPageUrl, customer.bookingRequestOfferId, 'chat');

        await Promise.all([
            sendSafely(serverRuntime, 'bookingRequestOfferChatMessageNotifyEmailSend', args.bookingRequestOfferId, () =>
                serverRuntime.email.send({
                    to: cook.emailAddress,
                    subject: bookingRequestOfferChatMessageNotifyForCookEmailSubject(locale),
                    react: BookingRequestOfferChatMessageNotifyForCookEmail({
                        locale,
                        webPageUrl,
                        recipientFirstName: cook.firstName,
                        senderFirstName: customer.firstName,
                        messageBody,
                        chatUrl,
                    }),
                    purpose: 'BOOKING_REQUEST_OFFER_CHAT_MESSAGE_TO_COOK',
                    locale,
                    relatedEntity: { type: 'BOOKING_REQUEST_OFFER', id: customer.bookingRequestOfferId },
                    userId: customer.cookId,
                }),
            ),
            bookingRequestOfferChatUnreadCookWhatsAppSend(serverRuntime, {
                bookingRequestOfferId: customer.bookingRequestOfferId,
                bookingRequestId: customer.bookingRequestId,
                cookUserId: customer.cookId,
                customerFirstName: customer.firstName,
            }),
        ]);
    }
}
