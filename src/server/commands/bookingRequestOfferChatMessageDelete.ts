import { eq } from 'drizzle-orm';

import { bookingRequestOfferChatMessageAuthorCanDelete } from '../../shared';
import { bookingRequestOfferEvents, bookingRequestOffers, bookingRequests } from '../db/schema';
import type { BookingRequestOfferEventType } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { assertLegalAcceptanceCurrent } from '../guards/assertLegalAcceptanceCurrent';
import { userActiveStatusAssert } from '../utils/userActiveStatusAssert';

type AuthorRole = 'USER' | 'COOK';

type MessageSimplePayload = {
    messageBody: string;
    mediaUrls?: string[];
    originalCreatedAt?: string;
    handedOverFrom?: {
        cookId: string;
        cookDisplayName: string;
        sourceEventId: string;
    };
    hiddenByAdmin?: boolean;
    hiddenByAuthor?: boolean;
};

function expectedEventType(actorRole: AuthorRole): BookingRequestOfferEventType {
    return actorRole === 'USER' ? 'USER_MESSAGE_SIMPLE' : 'COOK_MESSAGE_SIMPLE';
}

function createdAtForAuthorDelete(eventCreatedAt: Date, payload: MessageSimplePayload): Date {
    if (typeof payload.originalCreatedAt === 'string') {
        const original = new Date(payload.originalCreatedAt);
        if (!Number.isNaN(original.getTime())) {
            return original;
        }
    }
    return eventCreatedAt;
}

/**
 * Soft-delete an own `USER_MESSAGE_SIMPLE` / `COOK_MESSAGE_SIMPLE` within 1 hour
 * of send. Hides the bubble from customer and cook; admin still sees it.
 */
export async function bookingRequestOfferChatMessageDelete(
    input: {
        actorUserId: string;
        actorRole: AuthorRole;
        bookingRequestOfferEventId: string;
    },
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    await assertLegalAcceptanceCurrent(input.actorUserId, requestingSession, serverRuntime);
    await userActiveStatusAssert(input.actorUserId, serverRuntime, 'bookingRequestOfferChatMessageDelete');

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
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferEventId, input.bookingRequestOfferEventId))
            .limit(1);

        if (!row) {
            throw new Error('bookingRequestOfferChatMessageDelete: message not found');
        }
        if (input.actorRole === 'USER' && row.bookingRequest.userId !== input.actorUserId) {
            throw new Error('bookingRequestOfferChatMessageDelete: message not found');
        }
        if (input.actorRole === 'COOK' && row.offer.cookId !== input.actorUserId) {
            throw new Error('bookingRequestOfferChatMessageDelete: message not found');
        }
        if (row.event.type !== expectedEventType(input.actorRole)) {
            throw new Error('bookingRequestOfferChatMessageDelete: only own messages can be deleted');
        }

        const previousPayload = row.event.payload as MessageSimplePayload;
        if (previousPayload.handedOverFrom) {
            throw new Error('bookingRequestOfferChatMessageDelete: only own messages can be deleted');
        }
        if (previousPayload.hiddenByAuthor === true) {
            throw new Error('bookingRequestOfferChatMessageDelete: message already deleted');
        }
        const createdAt = createdAtForAuthorDelete(row.event.createdAt, previousPayload);
        if (!bookingRequestOfferChatMessageAuthorCanDelete(createdAt)) {
            throw new Error('bookingRequestOfferChatMessageDelete: delete window has expired');
        }

        const nextPayload: MessageSimplePayload = {
            ...previousPayload,
            hiddenByAuthor: true,
        };

        await serverRuntime.db
            .update(bookingRequestOfferEvents)
            .set({ payload: nextPayload })
            .where(eq(bookingRequestOfferEvents.bookingRequestOfferEventId, input.bookingRequestOfferEventId));

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId: row.bookingRequest.userId }),
            serverRuntime.publish.userUpdates({ userId: row.offer.cookId }),
            serverRuntime.publish.adminUpdates(),
        ]);

        return { success: true, referenceId: input.bookingRequestOfferEventId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
