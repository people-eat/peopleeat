import type { FileUpload, WhatsAppMessage } from '../db/schema';
import type { GqlSChatMessageDeliveryStatus, GqlSHumanChatMessage, GqlSPublicUser } from '../graphql/generated';
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

/** Project WhatsApp message rows onto the human chat message union for admin UI. */
export function toGqlWhatsAppMessages(input: {
    messages: ReadonlyArray<WhatsAppMessage>;
    customer: GqlSPublicUser;
    attachmentsByMessageId: Map<string, ReadonlyArray<Pick<FileUpload, 'fileUploadId' | 'filename' | 'mediaType' | 'size'>>>;
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
            createdAt: message.createdAt,
        };
    });
}
