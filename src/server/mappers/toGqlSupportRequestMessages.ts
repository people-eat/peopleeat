import type { FileUploadMetadata } from '../db/fileUploadMetadata';
import type { SupportRequestMessage, User } from '../db/schema';
import type { GqlSHumanChatMessage, GqlSPublicUser } from '../graphql/generated';
import { toGqlFileUpload } from './toGqlFileUpload';
import { toGqlPublicUser } from './toGqlPublicUser';

export type SupportChatViewerRole = 'user' | 'admin';

const ADMIN_PUBLIC_USER: GqlSPublicUser = {
    display: 'Admin',
    createdAt: new Date(0),
    profilePicture: null,
};

/** Project support-request message rows onto the human chat message union. */
export function toGqlSupportRequestMessages(input: {
    messages: ReadonlyArray<SupportRequestMessage>;
    customerUserId: string;
    customer: GqlSPublicUser;
    viewerRole: SupportChatViewerRole;
    authorsByUserId?: ReadonlyMap<string, Pick<User, 'firstName' | 'createdAt'>>;
    /** Send-ordered file metadata keyed by supportRequestMessageId (no bytes). */
    attachmentsByMessageId?: ReadonlyMap<string, ReadonlyArray<FileUploadMetadata>>;
}): GqlSHumanChatMessage[] {
    return input.messages.map((message) => {
        const isCustomer = message.authorUserId === input.customerUserId;
        const author = isCustomer
            ? input.customer
            : input.authorsByUserId?.has(message.authorUserId)
              ? toGqlPublicUser(input.authorsByUserId.get(message.authorUserId)!, null)
              : ADMIN_PUBLIC_USER;
        const isOwn = input.viewerRole === 'user' ? isCustomer : !isCustomer;
        const attachments = input.attachmentsByMessageId?.get(message.supportRequestMessageId) ?? [];
        return {
            gqlTypeName: 'ChatMessageUser' as const,
            chatMessageId: message.supportRequestMessageId,
            author,
            isOwn,
            showCopyButton: false,
            collapseLongBody: false,
            hiddenByAdmin: false,
            canHardDelete: false,
            body: message.body,
            attachments: attachments.map(toGqlFileUpload),
            deliveryStatus: null,
            reactions: [],
            createdAt: message.createdAt,
        };
    });
}
