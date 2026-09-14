import { eq } from 'drizzle-orm';

import { users, whatsAppConversations } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminWhatsAppConversation, GqlSAdminWhatsAppConversationArgs, GqlSSession } from '../graphql/generated';
import { toGqlAdminUser } from '../mappers/toGqlAdminUser';
import { toGqlAdminWhatsAppConversation } from '../mappers/toGqlAdminWhatsAppConversation';
import { adminUserTypesByUserIdFindMany } from '../utils/adminUserTypesByUserIdFindMany';
import { whatsAppConversationLastMessagePreviewsFindMany } from '../utils/whatsAppConversationLastMessagePreviewsFindMany';
import { whatsappConversationUserJoinOn } from '../utils/whatsappConversationUserJoinOn';

export async function adminWhatsAppConversationFindOne(
    args: GqlSAdminWhatsAppConversationArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminWhatsAppConversation | null> {
    try {
        const [joined] = await serverRuntime.db
            .select({
                conversation: whatsAppConversations,
                user: users,
            })
            .from(whatsAppConversations)
            .leftJoin(users, whatsappConversationUserJoinOn())
            .where(eq(whatsAppConversations.whatsAppConversationId, args.whatsAppConversationId))
            .limit(1);

        if (!joined) {
            return null;
        }

        const conversationId = joined.conversation.whatsAppConversationId;
        const [typesByUserId, lastMessagePreviews] = await Promise.all([
            joined.user ? adminUserTypesByUserIdFindMany([joined.user.userId], serverRuntime.db) : Promise.resolve(new Map()),
            whatsAppConversationLastMessagePreviewsFindMany(serverRuntime.db, [conversationId]),
        ]);

        return toGqlAdminWhatsAppConversation(
            joined.conversation,
            joined.user ? toGqlAdminUser(joined.user, typesByUserId.get(joined.user.userId) ?? ['customer']) : null,
            lastMessagePreviews.get(conversationId) ?? '',
        );
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
