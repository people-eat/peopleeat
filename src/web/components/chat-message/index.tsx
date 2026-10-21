import type { GqlCChatTurnFieldsFragment, GqlCHumanChatMessageFieldsFragment } from '../../graphql/generated';
import { ChatMessageBookingRequestOfferEventView } from './ChatMessageBookingRequestOfferEvent';
import { ChatMessagePartsView } from './ChatMessageParts';
import { ChatMessageUserView } from './ChatMessageUser';

type HumanMessage = GqlCHumanChatMessageFieldsFragment;
type AssistantMessage = GqlCChatTurnFieldsFragment['userMessage'];

interface HumanChatMessageProps {
    message: HumanMessage;
    showAuthorName?: boolean;
    showAuthorAvatar?: boolean;
    /** When set, simple user bubbles expose an edit control (admin offer chat). */
    onEditUserMessage?: (chatMessageId: string, body: string) => Promise<boolean>;
    /** Soft-hide / unhide (admin offer chat). */
    onVisibilityChangeUserMessage?: (chatMessageId: string, hiddenByAdmin: boolean) => Promise<boolean>;
    /** Hard-delete admin messages (admin offer chat). */
    onDeleteUserMessage?: (chatMessageId: string) => Promise<boolean>;
    /** When set, peer bubbles expose a reaction picker (WhatsApp Concierge). */
    onReactUserMessage?: (chatMessageId: string, emoji: string) => Promise<boolean>;
}

/** Offer/support human transcript row. */
export function HumanChatMessage({
    message,
    showAuthorName = true,
    showAuthorAvatar = true,
    onEditUserMessage,
    onVisibilityChangeUserMessage,
    onDeleteUserMessage,
    onReactUserMessage,
}: HumanChatMessageProps) {
    switch (message.__typename) {
        case 'ChatMessageUser':
            return (
                <ChatMessageUserView
                    message={message}
                    showAuthorName={showAuthorName}
                    showAuthorAvatar={showAuthorAvatar}
                    onEdit={onEditUserMessage ? (body) => onEditUserMessage(message.chatMessageId, body) : undefined}
                    onVisibilityChange={
                        onVisibilityChangeUserMessage
                            ? (hiddenByAdmin) => onVisibilityChangeUserMessage(message.chatMessageId, hiddenByAdmin)
                            : undefined
                    }
                    onDelete={onDeleteUserMessage ? () => onDeleteUserMessage(message.chatMessageId) : undefined}
                    onReact={onReactUserMessage ? (emoji) => onReactUserMessage(message.chatMessageId, emoji) : undefined}
                />
            );
        case 'ChatMessageBookingRequestOfferEvent':
            return <ChatMessageBookingRequestOfferEventView message={message} />;
        default:
            return null;
    }
}

interface AssistantChatMessageProps {
    message: AssistantMessage;
    onApprovalRespond?: (chatTurnId: string, approvalId: string, approved: boolean, reason?: string) => void;
    onPromptUserForInputSubmit?: (chatTurnId: string, toolCallId: string, answers: unknown) => void;
    chatTurnId: string;
}

/** Assistant turn message (user or assistant role) rendered from parts. */
export function ChatMessage({ message, chatTurnId, onApprovalRespond, onPromptUserForInputSubmit }: AssistantChatMessageProps) {
    if (message.role === 'USER') {
        const text = message.parts
            .filter(
                (part): part is Extract<typeof part, { __typename: 'ChatMessageTextPart' }> => part.__typename === 'ChatMessageTextPart',
            )
            .map((part) => part.text)
            .join('');
        return (
            <ChatMessageUserView
                message={{
                    __typename: 'ChatMessageUser',
                    chatMessageId: message.chatMessageId,
                    body: text,
                    createdAt: message.createdAt,
                    isOwn: true,
                    showCopyButton: false,
                    collapseLongBody: true,
                    hiddenByAdmin: false,
                    canHardDelete: false,
                    author: { display: 'You', createdAt: message.createdAt, profilePicture: null },
                    attachments: message.attachments,
                    reactions: [],
                }}
                showAuthorName={false}
                showAuthorAvatar={false}
            />
        );
    }

    return (
        <ChatMessagePartsView
            message={message}
            chatTurnId={chatTurnId}
            onApprovalRespond={onApprovalRespond}
            onPromptUserForInputSubmit={onPromptUserForInputSubmit}
        />
    );
}
