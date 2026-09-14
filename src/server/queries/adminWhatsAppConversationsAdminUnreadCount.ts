import { sum } from 'drizzle-orm';

import { whatsAppConversations } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSSession } from '../graphql/generated';

export async function adminWhatsAppConversationsAdminUnreadCount(
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<number> {
    try {
        const [row] = await serverRuntime.db.select({ value: sum(whatsAppConversations.adminUnreadCount) }).from(whatsAppConversations);
        return Number(row?.value ?? 0);
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
