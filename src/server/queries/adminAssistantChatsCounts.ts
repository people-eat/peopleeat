import { count } from 'drizzle-orm';

import { chats } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminAssistantChatCriterion, GqlSAdminAssistantChatsCountsArgs, GqlSSession } from '../graphql/generated';
import { adminAssistantChatCriterionWhere } from '../utils/adminAssistantChatCriterionWhere';

const ADMIN_COUNTS_CRITERIA_MAX = 20;

async function adminAssistantChatCountOne(criterion: GqlSAdminAssistantChatCriterion, serverRuntime: ServerRuntime): Promise<number> {
    const where = adminAssistantChatCriterionWhere(criterion, serverRuntime.db);
    const [row] = await serverRuntime.db.select({ value: count() }).from(chats).where(where);
    return row?.value ?? 0;
}

export async function adminAssistantChatsCounts(
    args: GqlSAdminAssistantChatsCountsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<number[]> {
    try {
        const { criteria } = args;
        if (criteria.length === 0) {
            throw new Error('adminAssistantChatsCounts: criteria must not be empty');
        }
        if (criteria.length > ADMIN_COUNTS_CRITERIA_MAX) {
            throw new Error('adminAssistantChatsCounts: too many criteria');
        }

        return await Promise.all(criteria.map((criterion) => adminAssistantChatCountOne(criterion, serverRuntime)));
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
