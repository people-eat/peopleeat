import { asc, eq } from 'drizzle-orm';

import { offerEventAttachmentsByEventIdLoad } from '../db/offerEventAttachmentsLoad';
import { bookingRequestOfferEvents, bookingRequests } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSHumanChatMessage, GqlSSession } from '../graphql/generated';
import type { OfferChatViewerRole } from '../mappers/toGqlOfferChatMessages';
import { toGqlOfferChatMessages } from '../mappers/toGqlOfferChatMessages';
import { bookingRequestOfferInitialChatMessageEnsure } from '../utils/bookingRequestOfferInitialChatMessage';
import { publicUsersByIdFindMany } from '../utils/publicUserHydrate';

/** Field resolver for `*BookingRequestOffer.messages` — loads only when selected. */
export async function bookingRequestOfferMessagesFindMany(
    parent: { bookingRequestOfferId: string; bookingRequestId: string; cookId: string; createdAt?: Date },
    viewerRole: OfferChatViewerRole,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSHumanChatMessage[]> {
    try {
        const [rawEvents, [bookingRequest]] = await Promise.all([
            serverRuntime.db
                .select()
                .from(bookingRequestOfferEvents)
                .where(eq(bookingRequestOfferEvents.bookingRequestOfferId, parent.bookingRequestOfferId))
                .orderBy(asc(bookingRequestOfferEvents.createdAt)),
            serverRuntime.db
                .select({
                    userId: bookingRequests.userId,
                    originalMessage: bookingRequests.originalMessage,
                    adjustedMessage: bookingRequests.adjustedMessage,
                })
                .from(bookingRequests)
                .where(eq(bookingRequests.bookingRequestId, parent.bookingRequestId))
                .limit(1),
        ]);

        if (!bookingRequest) {
            throw new Error(`bookingRequestOfferMessagesFindMany: booking request ${parent.bookingRequestId} not found`);
        }

        const events = await bookingRequestOfferInitialChatMessageEnsure(serverRuntime.db, {
            bookingRequestOfferId: parent.bookingRequestOfferId,
            bookingRequest: {
                originalMessage: bookingRequest.originalMessage,
                adjustedMessage: bookingRequest.adjustedMessage ?? null,
            },
            events: rawEvents,
            fallbackCreatedAt: parent.createdAt,
        });

        const authorsByUserId = await publicUsersByIdFindMany(serverRuntime.db, [bookingRequest.userId, parent.cookId]);
        const customer = authorsByUserId.get(bookingRequest.userId);
        const cook = authorsByUserId.get(parent.cookId);
        if (!customer) {
            throw new Error(`bookingRequestOfferMessagesFindMany: customer ${bookingRequest.userId} not found`);
        }
        if (!cook) {
            throw new Error(`bookingRequestOfferMessagesFindMany: cook ${parent.cookId} not found`);
        }

        const messageSimpleIds = events
            .filter(
                (event) =>
                    event.type === 'USER_MESSAGE_SIMPLE' || event.type === 'COOK_MESSAGE_SIMPLE' || event.type === 'ADMIN_MESSAGE_SIMPLE',
            )
            .map((event) => event.bookingRequestOfferEventId);
        const attachmentsByEventId = await offerEventAttachmentsByEventIdLoad(serverRuntime.db, messageSimpleIds);

        return toGqlOfferChatMessages({
            events,
            customer,
            cook,
            viewerRole,
            attachmentsByEventId,
        });
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
