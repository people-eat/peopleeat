import { useState } from 'react';

import { groupMessagesByDate, peerUserMessageStreak } from '../chat/chatTranscript';
import type { GqlCHumanChatMessageFieldsFragment } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import { ChatTranscriptShell } from './base/chat-transcript-shell';
import { MessageScrollerItem } from './base/message-scroller';
import { StatusAlert } from './base/status-alert';
import { HumanChatMessage } from './chat-message';
import { ChatDateMarker } from './chat-message/ChatDateMarker';
import { MessageComposer } from './MessageComposer';

function WhatsAppPresenceBanner({ peerDisplay, className }: { peerDisplay: string; className?: string }) {
    const locale = useLocale();
    return (
        <div className={cn('mb-2 flex shrink-0 flex-col gap-0.5 p-1 sm:px-2', className)}>
            <span className="text-sm font-semibold text-foreground">{peerDisplay}</span>
            <span className="text-sm text-muted-foreground">
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
    className,
}: {
    messages: ReadonlyArray<GqlCHumanChatMessageFieldsFragment>;
    canSend: boolean;
    onSend: (message: string) => Promise<boolean>;
    onReact: (chatMessageId: string, emoji: string) => Promise<boolean>;
    peerDisplay: string;
    className?: string;
}) {
    const locale = useLocale();
    const [draft, setDraft] = useState('');
    const [busy, setBusy] = useState(false);
    const groupedMessages = groupMessagesByDate(messages);

    return (
        <div className={cn('grid min-h-0 flex-1 grid-rows-[1fr_auto] md:grid-rows-[auto_1fr_auto]', className)}>
            <WhatsAppPresenceBanner peerDisplay={peerDisplay} className="hidden md:flex" />
            <ChatTranscriptShell
                mode="human"
                jumpToLatestLabel={{ de: 'Zum neuesten springen', en: 'Jump to latest' }[locale]}
                contentClassName="w-full gap-3"
                className="min-h-0 min-w-0"
                viewportClassName="px-1 sm:px-2"
            >
                <MessageScrollerItem className="md:hidden">
                    <WhatsAppPresenceBanner peerDisplay={peerDisplay} className="mb-0 px-0 sm:px-0" />
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
                <div className="px-1 pt-3 pb-(--chat-composer-pb) sm:px-2">
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
