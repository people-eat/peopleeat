import type { FileUpload, WhatsAppMessage, WhatsAppMessageReaction } from '../db/schema';
import type { GqlSChatMessageDeliveryStatus, GqlSChatMessageReaction, GqlSHumanChatMessage, GqlSPublicUser } from '../graphql/generated';
import { toGqlFileUpload } from './toGqlFileUpload';

const ADMIN_PUBLIC_USER: GqlSPublicUser = {
    display: 'Admin',
    createdAt: new Date(0),
    profilePicture: null,
};

function deliveryStatusResolve(message: WhatsAppMessage): GqlSChatMessageDeliveryStatus | null {
    if (message.direction !== 'OUTBOUND') {
        return null;
    }
    if (message.failedAt) return 'FAILED';
    if (message.readAt) return 'READ';
    if (message.deliveredAt) return 'DELIVERED';
    return 'SENT';
}

function reactionsResolve(rows: ReadonlyArray<WhatsAppMessageReaction> | undefined): GqlSChatMessageReaction[] {
    if (!rows?.length) return [];
    return rows
        .filter((row): row is WhatsAppMessageReaction & { emoji: string } => Boolean(row.emoji?.trim()))
        .map((row) => ({
            emoji: row.emoji.trim(),
            // Admin Concierge: outbound reactions are the viewer's party.
            isOwn: row.direction === 'OUTBOUND',
        }));
}

/** Project WhatsApp message rows onto the human chat message union for admin UI. */
export function toGqlWhatsAppMessages(input: {
    messages: ReadonlyArray<WhatsAppMessage>;
    customer: GqlSPublicUser;
    attachmentsByMessageId: Map<string, ReadonlyArray<Pick<FileUpload, 'fileUploadId' | 'filename' | 'mediaType' | 'size'>>>;
    reactionsByMessageId?: Map<string, ReadonlyArray<WhatsAppMessageReaction>>;
}): GqlSHumanChatMessage[] {
    return input.messages.map((message) => {
        const isInbound = message.direction === 'INBOUND';
        const attachments = (input.attachmentsByMessageId.get(message.whatsAppMessageId) ?? []).map(toGqlFileUpload);
        return {
            gqlTypeName: 'ChatMessageUser' as const,
            chatMessageId: message.whatsAppMessageId,
            author: isInbound ? input.customer : ADMIN_PUBLIC_USER,
            isOwn: !isInbound,
            showCopyButton: false,
            collapseLongBody: false,
            body: message.body,
            attachments,
            deliveryStatus: deliveryStatusResolve(message),
            reactions: reactionsResolve(input.reactionsByMessageId?.get(message.whatsAppMessageId)),
            createdAt: message.createdAt,
        };
    });
}
