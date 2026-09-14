import { and, desc, eq, ilike, isNotNull, isNull, or, sql } from 'drizzle-orm';

import { chats } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSChat, GqlSSession, GqlSUser, GqlSUserAssistantChatsArgs } from '../graphql/generated';
import { toGqlChat } from '../mappers/toGqlChat';
import { likeContainsPattern } from '../utils/likeContainsPattern';

export async function userAssistantChatFindMany(
    parentUser: GqlSUser,
    args: GqlSUserAssistantChatsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSChat[] | null> {
    if (!requestingSession.userId || requestingSession.userId !== parentUser.userId) {
        return null;
    }

    try {
        const { skip = 0, take = 25, surface, searchText } = args.criterion;
        const conditions = [
            eq(chats.userId, parentUser.userId),
            isNotNull(chats.userId),
            isNotNull(chats.surface),
            isNull(chats.deletedAt),
        ];
        if (surface) {
            conditions.push(eq(chats.surface, surface));
        }
        const pattern = likeContainsPattern(searchText);
        if (pattern) {
            conditions.push(or(ilike(chats.title, pattern), ilike(sql`(${chats.chatId})::text`, pattern))!);
        }

        const rows = await serverRuntime.db
            .select()
            .from(chats)
            .where(and(...conditions))
            .orderBy(desc(chats.lastModifiedAt))
            .offset(skip)
            .limit(take);

        return rows.map(toGqlChat);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
