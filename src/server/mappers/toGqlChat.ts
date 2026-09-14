import type { Chat } from '../db/schema';
import type { GqlSChat } from '../graphql/generated';

/** Maps a `Chats` row to GraphQL. `turns` is stubbed — `Chat.turns` resolves it. */
export function toGqlChat(chat: Chat): GqlSChat {
    return {
        chatId: chat.chatId,
        userId: chat.userId,
        surface: chat.surface,
        title: chat.title,
        lastModifiedAt: chat.lastModifiedAt,
        turns: [],
    };
}
