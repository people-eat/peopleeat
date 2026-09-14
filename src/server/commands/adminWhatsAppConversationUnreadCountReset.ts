import { and, desc, eq } from 'drizzle-orm';

import { whatsAppConversations, whatsAppMessages } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type {
    GqlSAdminMutation,
    GqlSAdminMutationWhatsAppConversationUnreadCountResetArgs,
    GqlSMutationResult,
    GqlSSession,
} from '../graphql/generated';

export async function adminWhatsAppConversationUnreadCountReset(
    _parent: GqlSAdminMutation,
    args: GqlSAdminMutationWhatsAppConversationUnreadCountResetArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    try {
        const updated = await serverRuntime.db
            .update(whatsAppConversations)
            .set({ adminUnreadCount: 0 })
            .where(eq(whatsAppConversations.whatsAppConversationId, args.whatsAppConversationId))
            .returning({ whatsAppConversationId: whatsAppConversations.whatsAppConversationId });

        if (updated.length === 0) {
            throw new Error('adminWhatsAppConversationUnreadCountReset: conversation not found');
        }

        const [latestInbound] = await serverRuntime.db
            .select({ providerMessageId: whatsAppMessages.providerMessageId })
            .from(whatsAppMessages)
            .where(and(eq(whatsAppMessages.whatsAppConversationId, args.whatsAppConversationId), eq(whatsAppMessages.direction, 'INBOUND')))
            .orderBy(desc(whatsAppMessages.createdAt))
            .limit(1);

        if (latestInbound?.providerMessageId) {
            await serverRuntime.whatsapp.markMessageAsRead(latestInbound.providerMessageId);
        }

        await serverRuntime.publish.adminUpdates();

        return { success: true, referenceId: args.whatsAppConversationId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
