import { and, eq, isNotNull, isNull } from 'drizzle-orm';

import { chats } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSChat, GqlSSession, GqlSUser, GqlSUserAssistantChatArgs } from '../graphql/generated';
import { toGqlChat } from '../mappers/toGqlChat';

export async function userAssistantChatFindOne(
    parentUser: GqlSUser,
    args: GqlSUserAssistantChatArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSChat | null> {
    if (!requestingSession.userId || requestingSession.userId !== parentUser.userId) {
        return null;
    }

    try {
        const [chat] = await serverRuntime.db
            .select()
            .from(chats)
            .where(
                and(
                    eq(chats.chatId, args.chatId),
                    eq(chats.userId, parentUser.userId),
                    isNotNull(chats.userId),
                    isNotNull(chats.surface),
                    isNull(chats.deletedAt),
                ),
            )
            .limit(1);

        if (!chat) {
            return null;
        }

        return toGqlChat(chat);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
