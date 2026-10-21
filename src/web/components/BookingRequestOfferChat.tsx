import { Link } from '@tanstack/react-router';
import { Fragment, useState } from 'react';

import { containsPhoneNumber } from '../../shared';
import { groupMessagesByDate, peerUserMessageStreak } from '../chat/chatTranscript';
import { useComposerFileAttachments } from '../chat/useComposerFileAttachments';
import type { GqlCHumanChatMessageFieldsFragment } from '../graphql/generated';
import { useFeatureToggleActive } from '../hooks/useFeatureToggleActive';
import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from './base/avatar';
import { ChatTranscriptShell } from './base/chat-transcript-shell';
import { MessageScrollerItem } from './base/message-scroller';
import { StatusAlert } from './base/status-alert';
import { HumanChatMessage } from './chat-message';
import { ChatDateMarker } from './chat-message/ChatDateMarker';
import { MessageComposer } from './MessageComposer';

export type BookingRequestOfferChatViewerRole = 'customer' | 'cook' | 'admin';

export type BookingRequestOfferChatPeer = {
    display: string;
    profilePictureUrl?: string | null;
    /** When set (admin surfaces), the presence avatar links to the user page. */
    userId?: string | null;
};

function peerInitials(display: string): string {
    const parts = display.trim().split(/\s+/u).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase();
}

function ConciergePresenceBanner({
    peers,
    title,
    body,
    className,
}: {
    peers: ReadonlyArray<BookingRequestOfferChatPeer>;
    title: string;
    body: string;
    className?: string;
}) {
    const locale = useLocale();
    const openUserLabel = { de: 'Nutzer öffnen', en: 'Open user' }[locale];

    return (
        <div className={cn('mb-2 flex shrink-0 items-center gap-3 p-1 sm:px-2', className)}>
            <AvatarGroup className="shrink-0">
                {peers.map((peer, index) => {
                    const key = `${peer.display}-${index}`;
                    const avatar = (
                        <Avatar size="lg" className="size-12">
                            {peer.profilePictureUrl ? <AvatarImage src={peer.profilePictureUrl} alt={peer.display} /> : null}
                            <AvatarFallback>{peerInitials(peer.display)}</AvatarFallback>
                        </Avatar>
                    );
                    if (!peer.userId) return <Fragment key={key}>{avatar}</Fragment>;
                    return (
                        <Link
                            key={key}
                            to="/{-$locale}/admin/users/$userId"
                            params={{ userId: peer.userId }}
                            aria-label={`${openUserLabel}: ${peer.display}`}
                            className="rounded-full focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                            {avatar}
                        </Link>
                    );
                })}
                <Avatar size="lg" className="size-12">
                    <AvatarImage src="/concierge-juliana.png" alt="Concierge Juliana" />
                    <AvatarFallback>J</AvatarFallback>
                </Avatar>
            </AvatarGroup>
            <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-semibold text-foreground">{title}</span>
                <span className="text-sm text-muted-foreground">{body}</span>
            </div>
        </div>
    );
}

export function BookingRequestOfferChat({
    messages,
    canSend,
    onSend,
    onEditMessage,
    onVisibilityChangeMessage,
    onDeleteMessage,
    onReactMessage,
    peers,
    viewerRole,
    className,
}: {
    messages: ReadonlyArray<GqlCHumanChatMessageFieldsFragment>;
    canSend: boolean;
    onSend: (message: string, fileUploadIds: string[]) => Promise<boolean>;
    /** Admin-only: edit a `*_MESSAGE_SIMPLE` body by chat message id. */
    onEditMessage?: (chatMessageId: string, message: string) => Promise<boolean>;
    /** Admin-only: soft-hide / unhide a `*_MESSAGE_SIMPLE` for customer and cook. */
    onVisibilityChangeMessage?: (chatMessageId: string, hiddenByAdmin: boolean) => Promise<boolean>;
    /** Admin-only: permanently delete an `ADMIN_MESSAGE_SIMPLE`. */
    onDeleteMessage?: (chatMessageId: string) => Promise<boolean>;
    /** When set and `BOOKING_REQUEST_OFFER_CHAT_REACTIONS` is on (incl. admin shell), peer bubbles get a reaction picker. */
    onReactMessage?: (chatMessageId: string, emoji: string) => Promise<boolean>;
    peers: ReadonlyArray<BookingRequestOfferChatPeer>;
    viewerRole: BookingRequestOfferChatViewerRole;
    className?: string;
}) {
    const locale = useLocale();
    const reactionsEnabled = useFeatureToggleActive('BOOKING_REQUEST_OFFER_CHAT_REACTIONS', { gateInAdminShell: true });
    const [draft, setDraft] = useState('');
    const [busy, setBusy] = useState(false);
    const { attachments, onAttachmentsAdd, onAttachmentRemove, clearAttachments, restoreAttachments, uploadedFileUploadIds, hasUploaded } =
        useComposerFileAttachments();
    const groupedMessages = groupMessagesByDate(messages);
    const draftContainsPhoneNumber = containsPhoneNumber(draft);

    const presenceTitle = `${peers.map((peer) => peer.display).join(', ')} & Concierge Juliana`;
    const presenceBody = {
        customer: {
            de: 'Ihr seid direkt mit eurem Koch im Chat. Juliana unterstützt euch zusätzlich bei besonderen Anliegen oder Fragen.',
            en: 'You’re chatting directly with your chef. Juliana also supports you with special requests or questions.',
        },
        cook: {
            de: 'Ihr seid direkt mit eurem Gast im Chat. Juliana unterstützt euch zusätzlich bei besonderen Anliegen oder Fragen.',
            en: 'You’re chatting directly with your guest. Juliana also supports you with special requests or questions.',
        },
        admin: {
            de: 'Juliana ist mit im Chat und begleitet das Gespräch zwischen Gast und Koch.',
            en: 'Juliana is also in this chat and follows the conversation between guest and chef.',
        },
    }[viewerRole][locale];

    return (
        <div
            className={cn(
                'grid min-h-0 flex-1',
                canSend ? 'grid-rows-[1fr_auto] md:grid-rows-[auto_1fr_auto]' : 'grid-rows-[1fr] md:grid-rows-[auto_1fr]',
                className,
            )}
        >
            <ConciergePresenceBanner peers={peers} title={presenceTitle} body={presenceBody} className="hidden md:flex" />
            <ChatTranscriptShell
                mode="human"
                jumpToLatestLabel={{ de: 'Zum neuesten springen', en: 'Jump to latest' }[locale]}
                contentClassName="w-full gap-3"
                className="min-h-0 min-w-0"
                viewportClassName="px-1 sm:px-2"
            >
                <MessageScrollerItem className="md:hidden">
                    <ConciergePresenceBanner peers={peers} title={presenceTitle} body={presenceBody} className="mb-0 px-0 sm:px-0" />
                </MessageScrollerItem>
                {messages.length === 0 ? (
                    <MessageScrollerItem>
                        <p className="flex min-h-48 flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                            {
                                (canSend
                                    ? {
                                          de: 'Noch keine Nachrichten. Schreibe die erste Nachricht.',
                                          en: 'No messages yet. Send the first message.',
                                      }
                                    : {
                                          de: 'Noch keine Nachrichten.',
                                          en: 'No messages yet.',
                                      })[locale]
                            }
                        </p>
                    </MessageScrollerItem>
                ) : (
                    groupedMessages.flatMap((group) => [
                        <MessageScrollerItem key={`date-${group.date}`}>
                            <ChatDateMarker date={group.date} locale={locale} />
                        </MessageScrollerItem>,
                        ...group.messages.map((message, index) => {
                            const streak = peerUserMessageStreak(group.messages, index);
                            return (
                                <MessageScrollerItem key={message.chatMessageId} className={streak.continued ? '-mt-1.5' : undefined}>
                                    <HumanChatMessage
                                        message={message}
                                        showAuthorName={streak.showName}
                                        showAuthorAvatar={streak.showAvatar}
                                        onEditUserMessage={onEditMessage}
                                        onVisibilityChangeUserMessage={onVisibilityChangeMessage}
                                        onDeleteUserMessage={onDeleteMessage}
                                        onReactUserMessage={
                                            reactionsEnabled && onReactMessage
                                                ? (chatMessageId, emoji) => onReactMessage(chatMessageId, emoji)
                                                : undefined
                                        }
                                    />
                                </MessageScrollerItem>
                            );
                        }),
                    ])
                )}
            </ChatTranscriptShell>
            {canSend ? (
                <div className="flex flex-col gap-2 px-1 pt-3 pb-(--chat-composer-pb) sm:px-2">
                    {draftContainsPhoneNumber ? (
                        <StatusAlert tone="warning">
                            {
                                {
                                    de: 'Das Teilen von Telefonnummern ist nicht erlaubt. Bitte bleibe für Absprachen hier im Chat.',
                                    en: 'Sharing phone numbers is not allowed. Please keep arrangements in this chat.',
                                }[locale]
                            }
                        </StatusAlert>
                    ) : null}
                    <MessageComposer
                        value={draft}
                        onValueChange={setDraft}
                        busy={busy}
                        sendDisabled={draftContainsPhoneNumber}
                        showDisclaimer={false}
                        ariaLabel={{ de: 'Nachricht an Angebot', en: 'Offer message' }[locale]}
                        attachments={attachments}
                        onAttachmentsAdd={onAttachmentsAdd}
                        onAttachmentRemove={onAttachmentRemove}
                        onSubmit={async () => {
                            const text = draft.trim();
                            if ((!text && !hasUploaded) || busy) return false;
                            if (text.length > 0 && containsPhoneNumber(text)) return false;
                            const sentAttachments = attachments;
                            const fileUploadIds = uploadedFileUploadIds;
                            setBusy(true);
                            setDraft('');
                            clearAttachments();
                            try {
                                const ok = await onSend(text, fileUploadIds);
                                if (!ok) {
                                    setDraft(text);
                                    restoreAttachments(sentAttachments);
                                }
                                return ok;
                            } finally {
                                setBusy(false);
                            }
                        }}
                    />
                </div>
            ) : null}
        </div>
    );
}
