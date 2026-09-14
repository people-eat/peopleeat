import { eq } from 'drizzle-orm';

import { containsPhoneNumber } from '../../shared';
import { bookingRequestOfferEventAttachments, bookingRequestOfferEvents, bookingRequestOffers, bookingRequests } from '../db/schema';
import type { BookingRequestOfferEventType } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationBookingRequestOfferChatMessageUpdateArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';

const MESSAGE_SIMPLE_TYPES = new Set<BookingRequestOfferEventType>(['USER_MESSAGE_SIMPLE', 'COOK_MESSAGE_SIMPLE', 'ADMIN_MESSAGE_SIMPLE']);

type MessageSimplePayload = {
    messageBody: string;
    mediaUrls?: string[];
    originalCreatedAt?: string;
    handedOverFrom?: {
        cookId: string;
        cookDisplayName: string;
        sourceEventId: string;
    };
};

export async function adminBookingRequestOfferChatMessageUpdate(
    _parent: GqlSAdminMutation,
    args: GqlSAdminMutationBookingRequestOfferChatMessageUpdateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const message = args.message.trim();
    if (message.length > 0 && containsPhoneNumber(message)) {
        throw new Error('adminBookingRequestOfferChatMessageUpdate: phone numbers are not allowed');
    }

    const { bookingRequestOfferEventId } = args;

    try {
        const [row] = await serverRuntime.db
            .select({
                event: bookingRequestOfferEvents,
                offer: bookingRequestOffers,
                bookingRequest: bookingRequests,
            })
            .from(bookingRequestOfferEvents)
            .innerJoin(
                bookingRequestOffers,
                eq(bookingRequestOffers.bookingRequestOfferId, bookingRequestOfferEvents.bookingRequestOfferId),
            )
            .innerJoin(bookingRequests, eq(bookingRequests.bookingRequestId, bookingRequestOffers.bookingRequestId))
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferEventId, bookingRequestOfferEventId))
            .limit(1);

        if (!row) {
            throw new Error('adminBookingRequestOfferChatMessageUpdate: message not found');
        }
        if (!MESSAGE_SIMPLE_TYPES.has(row.event.type)) {
            throw new Error('adminBookingRequestOfferChatMessageUpdate: only simple chat messages can be edited');
        }

        if (message.length === 0) {
            const [attachment] = await serverRuntime.db
                .select({ fileUploadId: bookingRequestOfferEventAttachments.fileUploadId })
                .from(bookingRequestOfferEventAttachments)
                .where(eq(bookingRequestOfferEventAttachments.bookingRequestOfferEventId, bookingRequestOfferEventId))
                .limit(1);
            if (!attachment) {
                throw new Error('adminBookingRequestOfferChatMessageUpdate: message must not be empty');
            }
        }

        const previousPayload = row.event.payload as MessageSimplePayload;
        const nextPayload: MessageSimplePayload = {
            ...previousPayload,
            messageBody: message,
        };

        await serverRuntime.db
            .update(bookingRequestOfferEvents)
            .set({ payload: nextPayload })
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferEventId, bookingRequestOfferEventId));

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId: row.bookingRequest.userId }),
            serverRuntime.publish.userUpdates({ userId: row.offer.cookId }),
            serverRuntime.publish.adminUpdates(),
        ]);

        return { success: true, referenceId: bookingRequestOfferEventId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
