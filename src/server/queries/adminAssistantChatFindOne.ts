import { and, eq, isNotNull } from 'drizzle-orm';

import { chats } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminAssistantChat, GqlSAdminAssistantChatArgs, GqlSSession } from '../graphql/generated';
import { toGqlAdminAssistantChat } from '../mappers/toGqlAdminAssistantChat';

export async function adminAssistantChatFindOne(
    args: GqlSAdminAssistantChatArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminAssistantChat | null> {
    try {
        const [row] = await serverRuntime.db
            .select()
            .from(chats)
            .where(and(eq(chats.chatId, args.chatId), isNotNull(chats.userId), isNotNull(chats.surface)))
            .limit(1);

        if (!row || !row.userId || !row.surface) {
            return null;
        }

        return toGqlAdminAssistantChat({
            ...row,
            userId: row.userId,
            surface: row.surface,
        });
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
