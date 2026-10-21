import { eq } from 'drizzle-orm';

import { textNormalizeProseTitled } from '../../shared/textNormalize';
import { users, whatsAppConversations } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSAdminMutation, GqlSAdminMutationWhatsAppMessageCreateArgs, GqlSMutationResult, GqlSSession } from '../graphql/generated';

export async function adminWhatsAppMessageCreate(
    { adminId }: GqlSAdminMutation,
    args: GqlSAdminMutationWhatsAppMessageCreateArgs,
    requestingSession: GqlSSession,
    serverRuntime: ServerRuntime,
): Promise<GqlSMutationResult> {
    const message = textNormalizeProseTitled(args.message);
    if (message.length === 0) {
        throw new Error('adminWhatsAppMessageCreate: message must not be empty');
    }

    try {
        const [conversation] = await serverRuntime.db
            .select()
            .from(whatsAppConversations)
            .where(eq(whatsAppConversations.whatsAppConversationId, args.whatsAppConversationId))
            .limit(1);

        if (!conversation) {
            throw new Error('adminWhatsAppMessageCreate: conversation not found');
        }

        const windowExpiresAt = conversation.customerServiceWindowExpiresAt;
        if (!windowExpiresAt || windowExpiresAt.getTime() <= Date.now()) {
            throw new Error('adminWhatsAppMessageCreate: customer-service window is closed');
        }

        const [adminUser] = await serverRuntime.db.select({ locale: users.locale }).from(users).where(eq(users.userId, adminId)).limit(1);

        const result = await serverRuntime.whatsapp.sendText({
            purpose: 'CONCIERGE_SESSION_REPLY',
            toPhoneNumber: conversation.phoneNumber,
            locale: adminUser?.locale ?? 'de',
            body: message,
            userId: conversation.userId,
            sentByAdminUserId: adminId,
            whatsAppConversationId: conversation.whatsAppConversationId,
        });

        await serverRuntime.publish.adminUpdates();

        return { success: true, referenceId: result.whatsAppMessageId };
    } catch (error) {
        serverRuntime.log.error(error, requestingSession);
        throw error;
    }
}
