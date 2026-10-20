import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import { groupMessagesByDate, peerUserMessageStreak } from '../chat/chatTranscript';
import type { GqlCHumanChatMessageFieldsFragment } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import { Avatar, AvatarFallback, AvatarImage } from './base/avatar';
import { ChatTranscriptShell } from './base/chat-transcript-shell';
import { MessageScrollerItem } from './base/message-scroller';
import { StatusAlert } from './base/status-alert';
import { HumanChatMessage } from './chat-message';
import { ChatDateMarker } from './chat-message/ChatDateMarker';
import { MessageComposer } from './MessageComposer';

function initialsFromName(name: string): string {
    const parts = name.trim().split(/\s+/u).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase();
}

function WhatsAppPresenceBanner({
    peerDisplay,
    profilePictureUrl,
    customerUserId,
    className,
}: {
    peerDisplay: string;
    profilePictureUrl: string | null;
    customerUserId: string | null;
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
            <span className="min-w-0 text-sm text-muted-foreground">
                {{ de: 'WhatsApp-Chat mit dem peopleeat Concierge.', en: 'WhatsApp chat with the peopleeat concierge.' }[locale]}
            </span>
        </div>
    );
}

export function WhatsAppConversationChat({
    messages,
    canSend,
    onSend,
    onReact,
    peerDisplay,
    profilePictureUrl,
    customerUserId,
    className,
}: {
    messages: ReadonlyArray<GqlCHumanChatMessageFieldsFragment>;
    canSend: boolean;
    onSend: (message: string) => Promise<boolean>;
    onReact: (chatMessageId: string, emoji: string) => Promise<boolean>;
    peerDisplay: string;
    profilePictureUrl: string | null;
    customerUserId: string | null;
    className?: string;
}) {
    const locale = useLocale();
    const [draft, setDraft] = useState('');
    const [busy, setBusy] = useState(false);
    const groupedMessages = groupMessagesByDate(messages);

    const presenceProps = { peerDisplay, profilePictureUrl, customerUserId };

    return (
        <div className={cn('grid min-h-0 flex-1 grid-rows-[1fr_auto] md:grid-rows-[auto_1fr_auto]', className)}>
            <WhatsAppPresenceBanner {...presenceProps} className="hidden md:flex" />
            <ChatTranscriptShell
                mode="human"
                jumpToLatestLabel={{ de: 'Zum neuesten springen', en: 'Jump to latest' }[locale]}
                contentClassName="w-full gap-3"
                className="min-h-0 min-w-0"
                viewportClassName="px-1 sm:px-2"
            >
                <MessageScrollerItem className="md:hidden">
                    <WhatsAppPresenceBanner {...presenceProps} className="mb-0 px-0 sm:px-0" />
                </MessageScrollerItem>
                {messages.length === 0 ? (
                    <MessageScrollerItem>
                        <p className="flex min-h-48 flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                            {{ de: 'Noch keine Nachrichten.', en: 'No messages yet.' }[locale]}
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
                                        onReactUserMessage={onReact}
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
                        showAttachButton={false}
                        ariaLabel={{ de: 'WhatsApp-Nachricht', en: 'WhatsApp message' }[locale]}
                        onSubmit={async () => {
                            const text = draft.trim();
                            if (!text || busy) return false;
                            setBusy(true);
                            setDraft('');
                            try {
                                const ok = await onSend(text);
                                if (!ok) setDraft(text);
                                return ok;
                            } finally {
                                setBusy(false);
                            }
                        }}
                    />
                </div>
            ) : (
                <div className="p-3 pb-(--chat-composer-pb)">
                    <StatusAlert tone="info">
                        {
                            {
                                de: 'Das 24-Stunden-Fenster ist geschlossen. Der Kunde muss zuerst schreiben, oder eine Lifecycle-Vorlage wird automatisch gesendet.',
                                en: 'The 24-hour window is closed. The customer must message first, or a lifecycle template is sent automatically.',
                            }[locale]
                        }
                    </StatusAlert>
                </div>
            )}
        </div>
    );
}
