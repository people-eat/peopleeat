import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { groupMessagesByDate, peerUserMessageStreak } from '../chat/chatTranscript';
import { useComposerFileAttachments } from '../chat/useComposerFileAttachments';
import type { GqlCHumanChatMessageFieldsFragment } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import { Avatar, AvatarFallback, AvatarImage } from './base/avatar';
import { ChatTranscriptShell } from './base/chat-transcript-shell';
import { MessageScrollerItem } from './base/message-scroller';
import { HumanChatMessage } from './chat-message';
import { ChatDateMarker } from './chat-message/ChatDateMarker';
import { MessageComposer } from './MessageComposer';

function initialsFromName(name: string): string {
    const parts = name.trim().split(/\s+/u).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase();
}

function SupportPresenceBanner({
    peerDisplay,
    profilePictureUrl,
    customerUserId,
    subtitle,
    context,
    trailing,
    className,
}: {
    peerDisplay: string;
    profilePictureUrl: string | null;
    customerUserId: string | null;
    subtitle: ReactNode;
    context?: ReactNode;
    trailing?: ReactNode;
    className?: string;
}) {
    const locale = useLocale();
    const openUserLabel = { de: 'Nutzer öffnen', en: 'Open user' }[locale];

    const avatar = (
        <Avatar size="lg" className="size-12">
            {profilePictureUrl ? <AvatarImage src={profilePictureUrl} alt={peerDisplay} /> : null}
            <AvatarFallback>{initialsFromName(peerDisplay)}</AvatarFallback>
        </Avatar>
    );

    return (
        <div className={cn('mb-2 flex shrink-0 items-center gap-3 p-1 sm:px-2', className)}>
            {customerUserId ? (
                <Link
                    to="/{-$locale}/admin/users/$userId"
                    params={{ userId: customerUserId }}
                    aria-label={openUserLabel}
                    className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                    {avatar}
                </Link>
            ) : (
                <span className="shrink-0">{avatar}</span>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                {subtitle ? <span className="text-sm text-muted-foreground">{subtitle}</span> : null}
                {context ? <div className="flex min-w-0 flex-col items-start gap-0.5">{context}</div> : null}
            </div>
            {trailing ? <div className="flex shrink-0 items-center gap-2 self-start">{trailing}</div> : null}
        </div>
    );
}

export function SupportRequestChat({
    messages,
    canSend,
    onSend,
    peerDisplay,
    profilePictureUrl = null,
    customerUserId = null,
    subtitle,
    context,
    trailing,
    className,
}: {
    messages: ReadonlyArray<GqlCHumanChatMessageFieldsFragment>;
    canSend: boolean;
    onSend: (message: string, fileUploadIds: string[]) => Promise<boolean>;
    peerDisplay: string;
    profilePictureUrl?: string | null;
    customerUserId?: string | null;
    /** Presence intro line. Pass `null` to omit (admin detail uses status / booking context instead). */
    subtitle?: ReactNode | null;
    context?: ReactNode;
    trailing?: ReactNode;
    className?: string;
}) {
    const locale = useLocale();
    const [draft, setDraft] = useState('');
    const [busy, setBusy] = useState(false);
    const { attachments, onAttachmentsAdd, onAttachmentRemove, clearAttachments, restoreAttachments, uploadedFileUploadIds, hasUploaded } =
        useComposerFileAttachments();
    const groupedMessages = groupMessagesByDate(messages);

    const resolvedSubtitle =
        subtitle === undefined
            ? { de: 'Support-Chat mit dem peopleeat Team.', en: 'Support chat with the peopleeat team.' }[locale]
            : subtitle;

    const presenceProps = {
        peerDisplay,
        profilePictureUrl,
        customerUserId,
        subtitle: resolvedSubtitle,
        context,
        trailing,
    };

    return (
        <div className={cn('grid min-h-0 flex-1 grid-rows-[1fr_auto] md:grid-rows-[auto_1fr_auto]', className)}>
            <SupportPresenceBanner {...presenceProps} className="hidden md:flex" />
            <ChatTranscriptShell
                mode="human"
                jumpToLatestLabel={{ de: 'Zum neuesten springen', en: 'Jump to latest' }[locale]}
                contentClassName="w-full gap-3"
                className="min-h-0 min-w-0"
                viewportClassName="px-1 sm:px-2"
            >
                <MessageScrollerItem className="md:hidden">
                    <SupportPresenceBanner {...presenceProps} className="mb-0 px-0 sm:px-0" />
                </MessageScrollerItem>
                {messages.length === 0 ? (
                    <MessageScrollerItem>
                        <p className="flex min-h-48 flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                            {
                                {
                                    de: 'Noch keine Nachrichten.',
                                    en: 'No messages yet.',
                                }[locale]
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
                                    />
                                </MessageScrollerItem>
                            );
                        }),
                    ])
                )}
            </ChatTranscriptShell>
            {canSend ? (
                <div className="flex flex-col gap-2 px-1 pt-3 pb-(--chat-composer-pb) sm:px-2">
                    <MessageComposer
                        value={draft}
                        onValueChange={setDraft}
                        busy={busy}
                        showDisclaimer={false}
                        ariaLabel={{ de: 'Support-Nachricht', en: 'Support message' }[locale]}
                        attachments={attachments}
                        onAttachmentsAdd={onAttachmentsAdd}
                        onAttachmentRemove={onAttachmentRemove}
                        onSubmit={async () => {
                            const text = draft.trim();
                            if ((!text && !hasUploaded) || busy) return false;
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
