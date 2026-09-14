import { desc, sql } from 'drizzle-orm';

import { users, whatsAppConversations } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminWhatsAppConversation, GqlSAdminWhatsAppConversationsArgs, GqlSSession } from '../graphql/generated';
import { toGqlAdminUser } from '../mappers/toGqlAdminUser';
import { toGqlAdminWhatsAppConversation } from '../mappers/toGqlAdminWhatsAppConversation';
import { adminUserTypesByUserIdFindMany } from '../utils/adminUserTypesByUserIdFindMany';
import { adminWhatsAppConversationCriterionWhere } from '../utils/adminWhatsAppConversationCriterionWhere';
import { findManySkip, findManyTake } from '../utils/findManyTake';
import { whatsAppConversationLastMessagePreviewsFindMany } from '../utils/whatsAppConversationLastMessagePreviewsFindMany';
import { whatsappConversationUserJoinOn } from '../utils/whatsappConversationUserJoinOn';

export async function adminWhatsAppConversationFindMany(
    args: GqlSAdminWhatsAppConversationsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminWhatsAppConversation[]> {
    try {
        const criterion = args.criterion;
        const where = adminWhatsAppConversationCriterionWhere(criterion);

        const joined = await serverRuntime.db
            .select({
                conversation: whatsAppConversations,
                user: users,
            })
            .from(whatsAppConversations)
            .leftJoin(users, whatsappConversationUserJoinOn())
            .where(where)
            .orderBy(desc(sql`${whatsAppConversations.adminUnreadCount} > 0`), desc(whatsAppConversations.lastMessageAt))
            .limit(findManyTake(criterion.take))
            .offset(findManySkip(criterion.skip));

        const userIds = joined.flatMap((row) => (row.user ? [row.user.userId] : []));
        const conversationIds = joined.map((row) => row.conversation.whatsAppConversationId);
        const [typesByUserId, lastMessagePreviews] = await Promise.all([
            adminUserTypesByUserIdFindMany(userIds, serverRuntime.db),
            whatsAppConversationLastMessagePreviewsFindMany(serverRuntime.db, conversationIds),
        ]);

        return joined.map(({ conversation, user }) =>
            toGqlAdminWhatsAppConversation(
                conversation,
                user ? toGqlAdminUser(user, typesByUserId.get(user.userId) ?? ['customer']) : null,
                lastMessagePreviews.get(conversation.whatsAppConversationId) ?? '',
            ),
        );
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
