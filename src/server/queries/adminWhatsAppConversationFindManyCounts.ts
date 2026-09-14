import { count } from 'drizzle-orm';

import { users, whatsAppConversations } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminWhatsAppConversationsCountsArgs, GqlSSession } from '../graphql/generated';
import { adminWhatsAppConversationCriterionWhere } from '../utils/adminWhatsAppConversationCriterionWhere';
import { whatsappConversationUserJoinOn } from '../utils/whatsappConversationUserJoinOn';

export async function adminWhatsAppConversationFindManyCounts(
    args: GqlSAdminWhatsAppConversationsCountsArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<number[]> {
    try {
        const criteria = args.criteria;
        if (criteria.length === 0) {
            throw new Error('adminWhatsAppConversationFindManyCounts: criteria must not be empty');
        }
        if (criteria.length > 20) {
            throw new Error('adminWhatsAppConversationFindManyCounts: max 20 criteria');
        }

        return await Promise.all(
            criteria.map(async (criterion) => {
                const where = adminWhatsAppConversationCriterionWhere(criterion);
                const [row] = await serverRuntime.db
                    .select({ value: count() })
                    .from(whatsAppConversations)
                    .leftJoin(users, whatsappConversationUserJoinOn())
                    .where(where);
                return Number(row?.value ?? 0);
            }),
        );
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
