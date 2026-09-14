import { desc } from 'drizzle-orm';

import { chats } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminAssistantChat, GqlSAdminAssistantChatsArgs, GqlSChatSurface, GqlSSession } from '../graphql/generated';
import { toGqlAdminAssistantChat } from '../mappers/toGqlAdminAssistantChat';
import { adminAssistantChatCriterionWhere } from '../utils/adminAssistantChatCriterionWhere';
import { findManySkip, findManyTake } from '../utils/findManyTake';

export async function adminAssistantChatFindMany(
    args: GqlSAdminAssistantChatsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSAdminAssistantChat[]> {
    try {
        const criterion = args.criterion;
        const where = adminAssistantChatCriterionWhere(criterion, serverRuntime.db);
        const take = findManyTake(criterion.take);
        const skip = findManySkip(criterion.skip);

        const rows = await serverRuntime.db.select().from(chats).where(where).orderBy(desc(chats.lastModifiedAt)).limit(take).offset(skip);

        return rows.map((row) =>
            toGqlAdminAssistantChat({
                ...row,
                userId: row.userId!,
                surface: row.surface as GqlSChatSurface,
            }),
        );
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
