import { Link } from '@tanstack/react-router';
import { useMemo } from 'react';

import { formatDate, userDisplayName } from '../../../shared';
import type { TranscriptTurn } from '../../chat/chatTranscript';
import { groupMessagesByDate, transcriptRowsFromTurns } from '../../chat/chatTranscript';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { Badge } from '../../components/base/badge';
import { ChatTranscriptShell } from '../../components/base/chat-transcript-shell';
import { MessageScrollerItem } from '../../components/base/message-scroller';
import { Separator } from '../../components/base/separator';
import { ChatMessage } from '../../components/chat-message';
import { ChatDateMarker } from '../../components/chat-message/ChatDateMarker';
import type { GqlCAdminAssistantChatPageQuery } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { adminAssistantChatTitle, adminChatSurfaceLabel } from './adminAssistantChats';

export const adminAssistantChatPageTitle = { de: 'Assistent-Chat', en: 'Assistant chat' } as const;
export const adminAssistantChatPageDescription = {
    de: 'Transcript eines Assistent-Chats.',
    en: 'Transcript for an assistant chat.',
} as const;

type AdminAssistantChatDetail = NonNullable<
    NonNullable<NonNullable<GqlCAdminAssistantChatPageQuery['currentSession']['user']>['admin']>['assistantChat']
>;

export function AdminAssistantChatPage({ data }: { data: GqlCAdminAssistantChatPageQuery }) {
    const locale = useLocale();
    const chat = data.currentSession.user?.admin?.assistantChat ?? null;
    const crumbLabel = chat ? adminAssistantChatTitle(chat.title, locale) : adminAssistantChatPageTitle[locale];

    return (
        <AdminPageChrome
            crumbs={[
                { label: { de: 'Assistent-Chats', en: 'Assistant chats' }[locale], to: '/{-$locale}/admin/assistant-chats' },
                { label: crumbLabel },
            ]}
        >
            <main id="main-content" className="grid w-full content-start gap-8">
                {chat ? (
                    <AdminAssistantChatDetailFields chat={chat} />
                ) : (
                    <p className="text-sm text-muted-foreground">{{ de: 'Chat nicht gefunden.', en: 'Chat not found.' }[locale]}</p>
                )}
            </main>
        </AdminPageChrome>
    );
}

function AdminAssistantChatDetailFields({ chat }: { chat: AdminAssistantChatDetail }) {
    const locale = useLocale();
    const timeZone = useTimeZone();

    return (
        <div className="grid gap-8">
            <div className="grid gap-2">
                <h1 className="font-serif text-4xl/tight text-foreground">{adminAssistantChatTitle(chat.title, locale)}</h1>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="secondary">{adminChatSurfaceLabel(chat.surface, locale)}</Badge>
                    {chat.deletedAt ? <Badge variant="outline">{{ de: 'Gelöscht', en: 'Deleted' }[locale]}</Badge> : null}
                    <span className="tabular-nums">{formatDate(chat.lastModifiedAt, { locale, timeZone, dateStyle: 'medium' })}</span>
                </div>
            </div>

            <dl className="grid gap-4">
                <div className="grid gap-1">
                    <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {{ de: 'Nutzer', en: 'User' }[locale]}
                    </dt>
                    <dd className="text-sm text-foreground">
                        <div className="grid gap-0.5">
                            <Link
                                to="/{-$locale}/admin/users/$userId"
                                params={{ userId: chat.user.userId }}
                                className="font-medium text-foreground hover:underline"
                            >
                                {userDisplayName(chat.user)}
                            </Link>
                            <span className="text-muted-foreground">{chat.user.emailAddress}</span>
                        </div>
                    </dd>
                </div>
                <Separator />
                <DetailField label={{ de: 'Chat-ID', en: 'Chat ID' }[locale]} value={chat.chatId} mono />
                <Separator />
                <DetailField
                    label={{ de: 'Erstellt', en: 'Created' }[locale]}
                    value={formatDate(chat.createdAt, { locale, timeZone, dateStyle: 'long' })}
                />
                <Separator />
                <DetailField
                    label={{ de: 'Zuletzt geändert', en: 'Last modified' }[locale]}
                    value={formatDate(chat.lastModifiedAt, { locale, timeZone, dateStyle: 'long' })}
                />
            </dl>

            <section className="grid gap-3">
                <h2 className="text-lg font-medium">{{ de: 'Transcript', en: 'Transcript' }[locale]}</h2>
                <AdminAssistantChatTranscript turns={chat.turns} />
            </section>
        </div>
    );
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="grid gap-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
            <dd className={mono ? 'font-mono text-sm break-all text-foreground' : 'text-sm text-foreground'}>{value}</dd>
        </div>
    );
}

function AdminAssistantChatTranscript({ turns }: { turns: ReadonlyArray<TranscriptTurn> }) {
    const locale = useLocale();
    const rows = useMemo(() => transcriptRowsFromTurns(turns), [turns]);
    const grouped = groupMessagesByDate(rows);

    if (rows.length === 0) {
        return (
            <p className="text-sm text-muted-foreground">
                {{ de: 'Dieser Chat hat noch keine Nachrichten.', en: 'This chat has no messages yet.' }[locale]}
            </p>
        );
    }

    return (
        <div className="h-[min(70vh,40rem)] overflow-hidden rounded-xl border border-border">
            <ChatTranscriptShell
                mode="assistant"
                jumpToLatestLabel={{ de: 'Zum neuesten springen', en: 'Jump to latest' }[locale]}
                contentClassName="w-full gap-3"
                className="min-h-0 min-w-0"
                viewportClassName="px-3"
            >
                {grouped.flatMap((group) => [
                    <MessageScrollerItem key={`date-${group.date}`}>
                        <ChatDateMarker date={group.date} locale={locale} />
                    </MessageScrollerItem>,
                    ...group.messages.map((row) => (
                        <MessageScrollerItem key={row.key} scrollAnchor={row.role === 'user' || undefined}>
                            <ChatMessage
                                message={row.role === 'user' ? row.turn.userMessage : row.turn.assistantMessage}
                                chatTurnId={row.turn.chatTurnId}
                            />
                        </MessageScrollerItem>
                    )),
                ])}
            </ChatTranscriptShell>
        </div>
    );
}
