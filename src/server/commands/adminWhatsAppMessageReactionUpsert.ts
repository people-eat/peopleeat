import { eq } from 'drizzle-orm';

import { idCreate } from '../../shared/idCreate';
import { whatsAppConversations, whatsAppMessageReactions, whatsAppMessages } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationWhatsAppMessageReactionUpsertArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';

/** Meta accepts a Unicode emoji (or empty string to clear). Cap length for safety. */
const EMOJI_MAX_LENGTH = 16;

/**
 * Apply or clear the Concierge (business) emoji reaction on an inbound customer
 * message. Meta only allows reacting to user messages we have received.
 */
export async function adminWhatsAppMessageReactionUpsert(
    _parent: GqlSAdminMutation,
    args: GqlSAdminMutationWhatsAppMessageReactionUpsertArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const emoji = args.emoji.trim();
    if (emoji.length > EMOJI_MAX_LENGTH) {
        throw new Error('adminWhatsAppMessageReactionUpsert: emoji is too long');
    }

    try {
        const [message] = await serverRuntime.db
            .select()
            .from(whatsAppMessages)
            .where(eq(whatsAppMessages.whatsAppMessageId, args.whatsAppMessageId))
            .limit(1);

        if (!message) {
            throw new Error('adminWhatsAppMessageReactionUpsert: message not found');
        }
        if (message.direction !== 'INBOUND') {
            throw new Error('adminWhatsAppMessageReactionUpsert: can only react to inbound customer messages');
        }
        const targetProviderMessageId = message.providerMessageId?.trim();
        if (!targetProviderMessageId) {
            throw new Error('adminWhatsAppMessageReactionUpsert: message has no provider message id');
        }

        const [conversation] = await serverRuntime.db
            .select()
            .from(whatsAppConversations)
            .where(eq(whatsAppConversations.whatsAppConversationId, message.whatsAppConversationId))
            .limit(1);

        if (!conversation) {
            throw new Error('adminWhatsAppMessageReactionUpsert: conversation not found');
        }

        const result = await serverRuntime.whatsapp.sendReaction({
            toPhoneNumber: conversation.phoneNumber,
            providerMessageId: targetProviderMessageId,
            emoji,
        });

        const reactionProviderMessageId = result.providerMessageId?.trim() || `local-react-${idCreate()}`;
        const createdAt = new Date();

        await serverRuntime.db
            .insert(whatsAppMessageReactions)
            .values({
                whatsAppMessageReactionId: idCreate(),
                whatsAppMessageId: message.whatsAppMessageId,
                direction: 'OUTBOUND',
                emoji: emoji || null,
                providerMessageId: reactionProviderMessageId,
                createdAt,
            })
            .onConflictDoUpdate({
                target: [whatsAppMessageReactions.whatsAppMessageId, whatsAppMessageReactions.direction],
                set: {
                    emoji: emoji || null,
                    providerMessageId: reactionProviderMessageId,
                    createdAt,
                },
            });

        await serverRuntime.publish.adminUpdates();

        return { success: true, referenceId: message.whatsAppMessageId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
