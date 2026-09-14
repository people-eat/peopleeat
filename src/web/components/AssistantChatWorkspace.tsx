import { useNavigate, useRouterState } from '@tanstack/react-router';
import { PanelLeftIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { useMutation, useQuery } from 'urql';

import { idCreate } from '../../shared/idCreate';
import { writeActiveChatId } from '../chat/assistantActiveChatStorage';
import { assistantChatDetailTo, assistantChatIndexTo } from '../chat/assistantChatRoutes';
import { assistantChatTitle } from '../chat/assistantChatTitle';
import { ASSISTANT_EMPTY_COPY, assistantSidebarLabels } from '../chat/assistantSidebarCopy';
import type { AssistantSidebarSurface } from '../chat/assistantSidebarCopy';
import { assistantSidebarSuggestions } from '../chat/assistantSidebarSuggestions';
import { ChatComposer } from '../chat/ChatComposer';
import type { ChatComposerHandle } from '../chat/ChatComposer';
import { useAssistantSidebarUserUpdates } from '../chat/useAssistantSidebarUserUpdates';
import { useChatTurnLiveUpdates } from '../chat/useChatTurnLiveUpdates';
import { ChatInputCollectionRespondDocument, ChatPageDocument, ChatToolApprovalRespondDocument } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { DEFAULT_LOCALE } from '../utils/locale';
import type { Locale } from '../utils/locale';
import { Button } from './base/button';
import { ChatTranscriptShell } from './base/chat-transcript-shell';
import { MessageScrollerItem } from './base/message-scroller';
import { Spinner } from './base/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from './base/tooltip';
import { ChatMessage } from './chat-message';

function pathWithoutLocale(pathname: string, locale: Locale): string {
    if (locale !== DEFAULT_LOCALE && pathname.startsWith(`/${locale}/`)) {
        return pathname.slice(locale.length + 1) || '/';
    }
    if (locale !== DEFAULT_LOCALE && pathname === `/${locale}`) {
        return '/';
    }
    return pathname;
}

/**
 * Full-viewport owner assistant chat (compose empty or active transcript).
 * Used by `/admin/assistant` and `/profile/assistant` routes.
 */
export function AssistantChatWorkspace({
    surface,
    chatId,
    onToggleNav,
}: {
    surface: AssistantSidebarSurface;
    chatId?: string;
    onToggleNav: () => void;
}) {
    const locale = useLocale();
    const navigate = useNavigate();
    const pathname = useRouterState({ select: (state) => state.location.pathname });
    const path = pathWithoutLocale(pathname, locale);
    const [draft, setDraft] = useState('');
    const [title, setTitle] = useState<string | undefined>(undefined);
    const [refreshNonce, setRefreshNonce] = useState(0);
    const composerRef = useRef<ChatComposerHandle>(null);
    const navToggleLabel = { de: 'Seitenleiste umschalten', en: 'Toggle Sidebar' }[locale];

    useEffect(() => {
        if (chatId) writeActiveChatId(surface, chatId);
    }, [chatId, surface]);

    const onUserUpdate = useCallback(() => setRefreshNonce((n) => n + 1), []);
    useAssistantSidebarUserUpdates(onUserUpdate);

    const onMessageSent = useCallback(
        (nextChatId: string) => {
            writeActiveChatId(surface, nextChatId);
            if (nextChatId === chatId) return;
            void navigate({
                to: assistantChatDetailTo(surface),
                params: { chatId: nextChatId },
                replace: !chatId,
            });
        },
        [chatId, navigate, surface],
    );

    const onSuggest = useCallback((text: string) => {
        void composerRef.current?.submitText(text);
    }, []);

    const onChatMissing = useCallback(() => {
        void navigate({ to: assistantChatIndexTo(surface), replace: true });
    }, [navigate, surface]);

    const headerTitle = chatId
        ? title?.trim()
            ? title
            : assistantSidebarLabels.newChatTitle[locale]
        : assistantSidebarLabels.defaultTitle[locale];

    return (
        <main id="main-content" className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
            <header className="flex h-16 shrink-0 items-center gap-2 px-4">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            type="button"
                            data-sidebar="trigger"
                            data-slot="sidebar-trigger"
                            variant="outline"
                            size="icon"
                            className="-ml-1 size-8 shrink-0"
                            onClick={onToggleNav}
                            aria-label={navToggleLabel}
                        >
                            <PanelLeftIcon />
                            <span className="sr-only">{navToggleLabel}</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{navToggleLabel}</TooltipContent>
                </Tooltip>
                <h1 className="min-w-0 flex-1 truncate text-sm font-medium">{headerTitle}</h1>
            </header>
            <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col pt-2">
                {chatId ? (
                    <WorkspaceActive
                        chatId={chatId}
                        surface={surface}
                        draft={draft}
                        onDraftChange={setDraft}
                        composerRef={composerRef}
                        onMessageSent={onMessageSent}
                        onTitleChange={setTitle}
                        onChatMissing={onChatMissing}
                        refreshNonce={refreshNonce}
                    />
                ) : (
                    <WorkspaceEmpty
                        surface={surface}
                        path={path}
                        draft={draft}
                        onDraftChange={setDraft}
                        composerRef={composerRef}
                        onMessageSent={onMessageSent}
                        onSuggest={onSuggest}
                    />
                )}
            </div>
        </main>
    );
}

function WorkspaceEmpty({
    surface,
    path,
    draft,
    onDraftChange,
    composerRef,
    onMessageSent,
    onSuggest,
}: {
    surface: AssistantSidebarSurface;
    path: string;
    draft: string;
    onDraftChange: (value: string) => void;
    composerRef: RefObject<ChatComposerHandle | null>;
    onMessageSent: (chatId: string) => void;
    onSuggest: (text: string) => void;
}) {
    const locale = useLocale();
    const blurb = ASSISTANT_EMPTY_COPY[surface].blurb[locale];
    const suggestions = assistantSidebarSuggestions(surface, path);

    return (
        <>
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-4 py-10">
                <p className="max-w-md text-center text-sm text-muted-foreground">{blurb}</p>
                <div className="flex max-w-lg flex-wrap justify-center gap-2">
                    {suggestions.map((suggestion) => {
                        const label = suggestion[locale];
                        return (
                            <Button
                                key={label}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-auto max-w-full whitespace-normal px-3 py-1.5 text-left text-xs"
                                onClick={() => onSuggest(label)}
                            >
                                {label}
                            </Button>
                        );
                    })}
                </div>
            </div>
            <div className="shrink-0 px-4 pt-3 pb-(--chat-composer-pb)">
                <ChatComposer
                    ref={composerRef}
                    surface={surface}
                    value={draft}
                    onValueChange={onDraftChange}
                    onMessageSent={onMessageSent}
                    autoFocus
                />
            </div>
        </>
    );
}

function WorkspaceActive({
    chatId,
    surface,
    draft,
    onDraftChange,
    composerRef,
    onMessageSent,
    onTitleChange,
    onChatMissing,
    refreshNonce,
}: {
    chatId: string;
    surface: AssistantSidebarSurface;
    draft: string;
    onDraftChange: (value: string) => void;
    composerRef: RefObject<ChatComposerHandle | null>;
    onMessageSent: (chatId: string) => void;
    onTitleChange: (title: string | undefined) => void;
    onChatMissing: () => void;
    refreshNonce: number;
}) {
    const locale = useLocale();
    const [{ data, fetching, error }, reexecute] = useQuery({
        query: ChatPageDocument,
        variables: { chatId },
        requestPolicy: 'cache-and-network',
    });
    const chat = data?.currentSession.user?.assistantChat ?? null;
    const seedTurns = chat?.turns ?? [];
    const { turns, activeTurn } = useChatTurnLiveUpdates(chatId, seedTurns);
    const [, respondToCollection] = useMutation(ChatInputCollectionRespondDocument);
    const [, respondToApproval] = useMutation(ChatToolApprovalRespondDocument);
    const title = chat?.title ?? '';
    const wasBusyRef = useRef(false);

    useEffect(() => {
        if (refreshNonce === 0) return;
        void reexecute({ requestPolicy: 'network-only' });
    }, [refreshNonce, reexecute]);

    useEffect(() => {
        if (fetching) return;
        if (data?.currentSession.user != null && chat == null) {
            onChatMissing();
        }
    }, [chat, data, fetching, onChatMissing]);

    useEffect(() => {
        onTitleChange(title.trim() ? title : undefined);
    }, [onTitleChange, title]);

    const isLocked = Boolean(activeTurn && (activeTurn.status === 'QUEUED' || activeTurn.status === 'RUNNING'));

    useEffect(() => {
        const busy = Boolean(activeTurn && (activeTurn.status === 'QUEUED' || activeTurn.status === 'RUNNING'));
        const wasBusy = wasBusyRef.current;
        wasBusyRef.current = busy;
        if (!wasBusy || busy || title.trim()) return;
        const hasComplete = turns.some((turn) => turn.status === 'COMPLETE');
        if (!hasComplete) return;
        const timer = globalThis.setTimeout(() => {
            void reexecute({ requestPolicy: 'network-only' });
        }, 1200);
        return () => globalThis.clearTimeout(timer);
    }, [activeTurn, reexecute, title, turns]);

    const onApprovalRespond = useCallback(
        async (turnId: string, approvalId: string, approved: boolean, reason?: string) => {
            await respondToApproval({
                chatTurnId: turnId,
                approvalId,
                approved,
                reason,
                clientRequestId: idCreate(),
                requireToolCallApprovals: true,
            });
        },
        [respondToApproval],
    );

    const onPromptUserForInputSubmit = useCallback(
        async (turnId: string, toolCallId: string, answers: unknown) => {
            await respondToCollection({
                chatTurnId: turnId,
                toolCallId,
                answers,
                clientRequestId: idCreate(),
                requireToolCallApprovals: true,
            });
        },
        [respondToCollection],
    );

    const items = useMemo(() => {
        const nodes: ReactNode[] = [];
        for (const turn of turns) {
            nodes.push(
                <MessageScrollerItem key={`${turn.chatTurnId}-user`} scrollAnchor>
                    <ChatMessage message={turn.userMessage} chatTurnId={turn.chatTurnId} />
                </MessageScrollerItem>,
            );
            nodes.push(
                <MessageScrollerItem key={`${turn.chatTurnId}-assistant`}>
                    <ChatMessage
                        message={turn.assistantMessage}
                        chatTurnId={turn.chatTurnId}
                        onApprovalRespond={onApprovalRespond}
                        onPromptUserForInputSubmit={onPromptUserForInputSubmit}
                    />
                </MessageScrollerItem>,
            );
        }
        return nodes;
    }, [onApprovalRespond, onPromptUserForInputSubmit, turns]);

    if (error) {
        return (
            <div className="grid flex-1 place-items-center px-4 text-center text-sm text-destructive">
                {assistantSidebarLabels.loadError[locale]}
            </div>
        );
    }

    if (fetching && turns.length === 0) {
        return (
            <div className="grid flex-1 place-items-center">
                <Spinner className="size-4" />
            </div>
        );
    }

    return (
        <>
            <ChatTranscriptShell
                mode="assistant"
                className="min-h-0 flex-1"
                jumpToLatestLabel={assistantSidebarLabels.jumpToLatest[locale]}
            >
                {items}
            </ChatTranscriptShell>
            <div className="shrink-0 px-4 pt-3 pb-(--chat-composer-pb)">
                <ChatComposer
                    ref={composerRef}
                    chatId={chatId}
                    surface={surface}
                    value={draft}
                    onValueChange={onDraftChange}
                    onMessageSent={onMessageSent}
                    isLocked={isLocked}
                />
            </div>
            <span className="sr-only">{assistantChatTitle(title, locale)}</span>
        </>
    );
}
