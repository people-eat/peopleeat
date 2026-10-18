import { eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { bookingRequestOfferEventReactions, bookingRequestOfferEvents, bookingRequestOffers, bookingRequests } from '../db/schema';
import type { BookingRequestOfferChatReactorRole } from '../domain/bookingRequest';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSMutationResult, GqlSSession } from '../graphql/generated';
import { bookingRequestOfferChatWritableAssert } from '../utils/bookingRequestOfferChatWritableAssert';
import { featureToggleIsEnabled } from '../utils/featureToggleIsEnabled';

const EMOJI_MAX_LENGTH = 16;

const MESSAGE_SIMPLE_TYPES = new Set(['USER_MESSAGE_SIMPLE', 'COOK_MESSAGE_SIMPLE', 'ADMIN_MESSAGE_SIMPLE']);

/**
 * Apply or clear an emoji reaction on a `*_MESSAGE_SIMPLE` offer-chat event.
 * One reaction per party (`reactorRole`). No unread / email side effects.
 * Gated by `BOOKING_REQUEST_OFFER_CHAT_REACTIONS`.
 */
export async function bookingRequestOfferChatMessageReactionUpsert(
    input: {
        reactorUserId: string;
        reactorRole: BookingRequestOfferChatReactorRole;
        bookingRequestOfferEventId: string;
        emoji: string;
    },
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const emoji = input.emoji.trim();
    if (emoji.length > EMOJI_MAX_LENGTH) {
        throw new Error('bookingRequestOfferChatMessageReactionUpsert: emoji is too long');
    }

    const enabled = await featureToggleIsEnabled('BOOKING_REQUEST_OFFER_CHAT_REACTIONS', serverRuntime, input.reactorUserId);
    if (!enabled) {
        throw new Error('bookingRequestOfferChatMessageReactionUpsert: feature is disabled');
    }

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
            throw new Error('bookingRequestOfferChatMessageReactionUpsert: message not found');
        }
        if (!MESSAGE_SIMPLE_TYPES.has(row.event.type)) {
            throw new Error('bookingRequestOfferChatMessageReactionUpsert: can only react to free-text messages');
        }

        switch (input.reactorRole) {
            case 'USER':
                if (row.bookingRequest.userId !== input.reactorUserId) {
                    throw new Error('bookingRequestOfferChatMessageReactionUpsert: offer not found');
                }
                bookingRequestOfferChatWritableAssert({ offer: row.offer, bookingRequest: row.bookingRequest });
                break;
            case 'COOK':
                if (row.offer.cookId !== input.reactorUserId) {
                    throw new Error('bookingRequestOfferChatMessageReactionUpsert: offer not found');
                }
                bookingRequestOfferChatWritableAssert({ offer: row.offer, bookingRequest: row.bookingRequest });
                break;
            case 'ADMIN':
                break;
        }

        const createdAt = new Date();
        await serverRuntime.db
            .insert(bookingRequestOfferEventReactions)
            .values({
                bookingRequestOfferEventReactionId: idCreate(),
                bookingRequestOfferEventId: row.event.bookingRequestOfferEventId,
                reactorRole: input.reactorRole,
                reactorUserId: input.reactorUserId,
                emoji: emoji || null,
                createdAt,
            })
            .onConflictDoUpdate({
                target: [bookingRequestOfferEventReactions.bookingRequestOfferEventId, bookingRequestOfferEventReactions.reactorRole],
                set: {
                    emoji: emoji || null,
                    reactorUserId: input.reactorUserId,
                    createdAt,
                },
            });

        await Promise.all([
            serverRuntime.publish.userUpdates({ userId: row.bookingRequest.userId }),
            serverRuntime.publish.userUpdates({ userId: row.offer.cookId }),
            serverRuntime.publish.adminUpdates(),
        ]);

        return { success: true, referenceId: row.event.bookingRequestOfferEventId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
