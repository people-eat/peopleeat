import type { WhatsAppConversation } from '../db/schema';
import type { GqlSAdminUser, GqlSAdminWhatsAppConversation } from '../graphql/generated';

export function toGqlAdminWhatsAppConversation(
    conversation: WhatsAppConversation,
    customer: GqlSAdminUser | null,
    lastMessagePreview = '',
): GqlSAdminWhatsAppConversation {
    return {
        whatsAppConversationId: conversation.whatsAppConversationId,
        phoneNumber: conversation.phoneNumber,
        displayName: conversation.displayName,
        userId: conversation.userId,
        lastMessageAt: conversation.lastMessageAt,
        lastMessagePreview,
        adminUnreadCount: conversation.adminUnreadCount,
        customerServiceWindowExpiresAt: conversation.customerServiceWindowExpiresAt,
        createdAt: conversation.createdAt,
        customer,
        messages: [],
    };
}
