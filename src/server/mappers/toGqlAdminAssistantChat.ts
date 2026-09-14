import type { Chat } from '../db/schema';
import type { GqlSAdminAssistantChat, GqlSChatSurface } from '../graphql/generated';

/** Maps an owned `Chats` row to GraphQL. `user` / `turns` are stubbed —
 * `AdminAssistantChat.user` / `.turns` resolve them. Caller must pass a row
 * with non-null `userId` + `surface`. */
export function toGqlAdminAssistantChat(chat: Chat & { userId: string; surface: GqlSChatSurface }): GqlSAdminAssistantChat {
    return {
        chatId: chat.chatId,
        userId: chat.userId,
        surface: chat.surface,
        title: chat.title,
        lastModifiedAt: chat.lastModifiedAt,
        createdAt: chat.createdAt,
        deletedAt: chat.deletedAt,

        // resolved fields
        user: null as unknown as GqlSAdminAssistantChat['user'],
        turns: [],
    };
}
