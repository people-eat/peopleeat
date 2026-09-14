import { useState } from 'react';

import { groupMessagesByDate, peerUserMessageStreak } from '../chat/chatTranscript';
import { useComposerFileAttachments } from '../chat/useComposerFileAttachments';
import type { GqlCHumanChatMessageFieldsFragment } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import { ChatTranscriptShell } from './base/chat-transcript-shell';
import { MessageScrollerItem } from './base/message-scroller';
import { HumanChatMessage } from './chat-message';
import { ChatDateMarker } from './chat-message/ChatDateMarker';
import { MessageComposer } from './MessageComposer';

function SupportPresenceBanner({ peerDisplay, resolved, className }: { peerDisplay: string; resolved: boolean; className?: string }) {
    const locale = useLocale();
    return (
        <div className={cn('mb-2 flex shrink-0 flex-col gap-0.5 p-1 sm:px-2', className)}>
            <span className="text-sm font-semibold text-foreground">{peerDisplay}</span>
            <span className="text-sm text-muted-foreground">
                {
                    {
                        de: 'Support-Chat mit dem peopleeat Team.',
                        en: 'Support chat with the peopleeat team.',
                    }[locale]
                }
            </span>
            {resolved ? (
                <p className="text-sm text-muted-foreground">
                    {
                        {
                            de: 'Diese Anfrage ist erledigt. Eine neue Nachricht öffnet sie wieder.',
                            en: 'This request is resolved. Sending a new message reopens it.',
                        }[locale]
                    }
                </p>
            ) : null}
        </div>
    );
}

export function SupportRequestChat({
    messages,
    canSend,
    onSend,
    peerDisplay,
    className,
    resolved = false,
}: {
    messages: ReadonlyArray<GqlCHumanChatMessageFieldsFragment>;
    canSend: boolean;
    onSend: (message: string, fileUploadIds: string[]) => Promise<boolean>;
    peerDisplay: string;
    className?: string;
    resolved?: boolean;
}) {
    const locale = useLocale();
    const [draft, setDraft] = useState('');
    const [busy, setBusy] = useState(false);
    const { attachments, onAttachmentsAdd, onAttachmentRemove, clearAttachments, restoreAttachments, uploadedFileUploadIds, hasUploaded } =
        useComposerFileAttachments();
    const groupedMessages = groupMessagesByDate(messages);

    return (
        <div className={cn('grid min-h-0 flex-1 grid-rows-[1fr_auto] md:grid-rows-[auto_1fr_auto]', className)}>
            <SupportPresenceBanner peerDisplay={peerDisplay} resolved={resolved} className="hidden md:flex" />
            <ChatTranscriptShell
                mode="human"
                jumpToLatestLabel={{ de: 'Zum neuesten springen', en: 'Jump to latest' }[locale]}
                contentClassName="w-full gap-3"
                className="min-h-0 min-w-0"
                viewportClassName="px-1 sm:px-2"
            >
                <MessageScrollerItem className="md:hidden">
                    <SupportPresenceBanner peerDisplay={peerDisplay} resolved={resolved} className="mb-0 px-0 sm:px-0" />
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
