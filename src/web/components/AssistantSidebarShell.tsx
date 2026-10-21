import { Link, useRouterState } from '@tanstack/react-router';
import {
    ArrowLeftIcon,
    BotMessageSquareIcon,
    EllipsisVerticalIcon,
    HistoryIcon,
    PencilIcon,
    SquareArrowOutUpRightIcon,
    SquarePenIcon,
    Trash2Icon,
    XIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentProps, ReactNode, PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { useMutation, useQuery } from 'urql';

import { idCreate } from '../../shared/idCreate';
import { clearActiveChatId, readActiveChatId, writeActiveChatId } from '../chat/assistantActiveChatStorage';
import { assistantChatDetailTo, assistantChatIndexTo } from '../chat/assistantChatRoutes';
import { assistantChatTitle } from '../chat/assistantChatTitle';
import { ASSISTANT_EMPTY_COPY, assistantSidebarLabels } from '../chat/assistantSidebarCopy';
import type { AssistantSidebarSurface } from '../chat/assistantSidebarCopy';
import { assistantSidebarSuggestions } from '../chat/assistantSidebarSuggestions';
import {
    ASSISTANT_SIDEBAR_WIDTH_DEFAULT_REM,
    clampAssistantSidebarWidthRem,
    readAssistantSidebarWidthRem,
    writeAssistantSidebarWidthRem,
} from '../chat/assistantSidebarWidth';
import { ChatComposer } from '../chat/ChatComposer';
import type { ChatComposerHandle } from '../chat/ChatComposer';
import { formatChatRelativeTime } from '../chat/formatChatRelativeTime';
import { useAssistantSidebarUserUpdates } from '../chat/useAssistantSidebarUserUpdates';
import { useChatTurnLiveUpdates } from '../chat/useChatTurnLiveUpdates';
import {
    ChatDeleteDocument,
    ChatInputCollectionRespondDocument,
    ChatPageDocument,
    ChatTitleUpdateDocument,
    ChatToolApprovalRespondDocument,
    UserAssistantChatsDocument,
} from '../graphql/generated';
import { useIsMobile } from '../hooks/use-mobile';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import { DEFAULT_LOCALE } from '../utils/locale';
import type { Locale } from '../utils/locale';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from './base/alert-dialog';
import { Button } from './base/button';
import { ChatTranscriptShell } from './base/chat-transcript-shell';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './base/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './base/dropdown-menu';
import { Input } from './base/input';
import { MessageScrollerItem } from './base/message-scroller';
import { Sidebar, SidebarContent, SidebarHeader, useSidebar } from './base/sidebar';
import { Skeleton } from './base/skeleton';
import { Spinner } from './base/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from './base/tooltip';
import { ChatMessage } from './chat-message';

type ShellMode = 'compose' | 'list';

const LIST_PAGE_SIZE = 30;
const LIST_SKELETON_ROWS = 6;

function pathWithoutLocale(pathname: string, locale: Locale): string {
    if (locale !== DEFAULT_LOCALE && pathname.startsWith(`/${locale}/`)) {
        return pathname.slice(locale.length + 1) || '/';
    }
    if (locale !== DEFAULT_LOCALE && pathname === `/${locale}`) {
        return '/';
    }
    return pathname;
}

export function AssistantSidebarShell({ surface, ...props }: ComponentProps<typeof Sidebar> & { surface: AssistantSidebarSurface }) {
    const locale = useLocale();
    const isMobile = useIsMobile();
    const { toggleSidebar, open, openMobile, setOpenMobile } = useSidebar();
    const pathname = useRouterState({ select: (state) => state.location.pathname });
    const path = pathWithoutLocale(pathname, locale);

    useEffect(() => {
        setOpenMobile(false);
    }, [pathname, setOpenMobile]);
    const [mode, setMode] = useState<ShellMode>('compose');
    const [chatId, setChatIdState] = useState<string | undefined>(() =>
        typeof window === 'undefined' ? undefined : readActiveChatId(surface),
    );
    const [draft, setDraft] = useState('');
    const [isTurnBusy, setIsTurnBusy] = useState(false);
    const [confirmNewChatOpen, setConfirmNewChatOpen] = useState(false);
    const [composeTitle, setComposeTitle] = useState<string | undefined>(undefined);
    const [widthRem, setWidthRem] = useState(ASSISTANT_SIDEBAR_WIDTH_DEFAULT_REM);
    const [isResizing, setIsResizing] = useState(false);
    const [refreshNonce, setRefreshNonce] = useState(0);
    const [renameChatId, setRenameChatId] = useState<string | undefined>(undefined);
    const [renameDraft, setRenameDraft] = useState('');
    const [deleteChatId, setDeleteChatId] = useState<string | undefined>(undefined);
    const composerRef = useRef<ChatComposerHandle>(null);
    const widthAnchorRef = useRef<HTMLSpanElement>(null);
    const [, renameChat] = useMutation(ChatTitleUpdateDocument);
    const [, deleteChat] = useMutation(ChatDeleteDocument);

    const railOpen = isMobile ? openMobile : open;

    useEffect(() => {
        setWidthRem(readAssistantSidebarWidthRem());
    }, []);

    useEffect(() => {
        const wrapper = widthAnchorRef.current?.closest('[data-slot="sidebar-wrapper"]');
        if (!(wrapper instanceof HTMLElement)) return;
        wrapper.style.setProperty('--sidebar-width', `${widthRem}rem`);
        for (const slot of ['sidebar-gap', 'sidebar-container'] as const) {
            const node = wrapper.querySelector(`[data-slot="${slot}"]`);
            if (node instanceof HTMLElement) {
                node.style.transition = isResizing ? 'none' : '';
            }
        }
    }, [widthRem, isResizing]);

    const onWidthRemChange = useCallback((next: number) => {
        const clamped = clampAssistantSidebarWidthRem(next);
        setWidthRem(clamped);
        writeAssistantSidebarWidthRem(clamped);
    }, []);

    const onUserUpdate = useCallback(() => setRefreshNonce((n) => n + 1), []);
    useAssistantSidebarUserUpdates(onUserUpdate);

    const setChatId = useCallback(
        (next: string | undefined) => {
            setChatIdState(next);
            if (next) writeActiveChatId(surface, next);
            else clearActiveChatId(surface);
        },
        [surface],
    );

    const doNewChat = useCallback(() => {
        setChatId(undefined);
        setDraft('');
        setComposeTitle(undefined);
        setIsTurnBusy(false);
        setMode('compose');
        setConfirmNewChatOpen(false);
    }, [setChatId]);

    const requestNewChat = useCallback(() => {
        if (isTurnBusy) {
            setConfirmNewChatOpen(true);
            return;
        }
        doNewChat();
    }, [doNewChat, isTurnBusy]);

    const openList = useCallback(() => setMode('list'), []);
    const backToCompose = useCallback(() => setMode('compose'), []);

    const onSelectChat = useCallback(
        (nextChatId: string) => {
            setChatId(nextChatId);
            setComposeTitle(undefined);
            setMode('compose');
        },
        [setChatId],
    );

    const onMessageSent = useCallback(
        (nextChatId: string) => {
            setChatId(nextChatId);
            setMode('compose');
        },
        [setChatId],
    );

    const onSuggest = useCallback((text: string) => {
        void composerRef.current?.submitText(text);
    }, []);

    const onClose = useCallback(() => {
        toggleSidebar();
    }, [toggleSidebar]);

    const openFullscreen = useCallback(() => {
        toggleSidebar();
    }, [toggleSidebar]);

    const openRename = useCallback((targetChatId: string, currentTitle: string) => {
        setRenameChatId(targetChatId);
        setRenameDraft(currentTitle.trim());
    }, []);

    const saveRename = useCallback(async () => {
        if (!renameChatId) return;
        const title = renameDraft.trim();
        if (!title) return;
        const result = await renameChat({ chatId: renameChatId, title });
        if (!result.error && result.data?.user.chatTitleUpdate.success) {
            if (renameChatId === chatId) setComposeTitle(title);
            setRenameChatId(undefined);
            setRefreshNonce((n) => n + 1);
        }
    }, [chatId, renameChat, renameChatId, renameDraft]);

    const confirmDelete = useCallback(async () => {
        if (!deleteChatId) return;
        const targetId = deleteChatId;
        const result = await deleteChat({ chatId: targetId });
        if (!result.error && result.data?.user.chatDelete.success) {
            setDeleteChatId(undefined);
            if (targetId === chatId) doNewChat();
            else setRefreshNonce((n) => n + 1);
        }
    }, [chatId, deleteChat, deleteChatId, doNewChat]);

    const headerTitle =
        mode === 'list'
            ? assistantSidebarLabels.allChatsTitle[locale]
            : chatId
              ? composeTitle?.trim()
                  ? composeTitle
                  : assistantSidebarLabels.newChatTitle[locale]
              : assistantSidebarLabels.defaultTitle[locale];

    const fullscreenLabel = assistantSidebarLabels.openFullscreen[locale];
    const fullscreenTo = chatId ? assistantChatDetailTo(surface) : assistantChatIndexTo(surface);
    const fullscreenParams = chatId ? { chatId } : undefined;

    return (
        <Sidebar side="right" variant="floating" mobileFullScreen className={cn(isResizing && 'transition-none!')} {...props}>
            <span ref={widthAnchorRef} className="hidden" aria-hidden />
            {!isMobile && railOpen ? (
                <AssistantResizeHandle widthRem={widthRem} onWidthRemChange={onWidthRemChange} onResizingChange={setIsResizing} />
            ) : null}
            <SidebarHeader>
                <div className="flex items-center gap-1 px-2 py-1.5">
                    {mode === 'list' ? (
                        <HeaderIconButton label={assistantSidebarLabels.backToChat[locale]} onClick={backToCompose}>
                            <ArrowLeftIcon />
                        </HeaderIconButton>
                    ) : (
                        <BotMessageSquareIcon className="ml-1 size-4 shrink-0" />
                    )}
                    {mode === 'compose' && chatId ? (
                        <button
                            type="button"
                            className="min-w-0 flex-1 truncate rounded-md px-1 text-left text-sm font-medium hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
                            onClick={() => openRename(chatId, composeTitle ?? '')}
                            title={assistantSidebarLabels.rename[locale]}
                        >
                            {headerTitle}
                        </button>
                    ) : (
                        <span className="min-w-0 flex-1 truncate px-1 text-sm font-medium">{headerTitle}</span>
                    )}
                    {mode === 'compose' && chatId ? (
                        <HeaderIconButton label={assistantSidebarLabels.newChat[locale]} onClick={requestNewChat}>
                            <SquarePenIcon />
                        </HeaderIconButton>
                    ) : null}
                    {mode === 'compose' ? (
                        <HeaderIconButton label={assistantSidebarLabels.allChats[locale]} onClick={openList}>
                            <HistoryIcon />
                        </HeaderIconButton>
                    ) : null}
                    {mode === 'compose' ? (
                        <HeaderIconLink label={fullscreenLabel} to={fullscreenTo} params={fullscreenParams} onClick={openFullscreen}>
                            <SquareArrowOutUpRightIcon />
                        </HeaderIconLink>
                    ) : null}
                    <HeaderIconButton label={assistantSidebarLabels.close[locale]} onClick={onClose}>
                        <XIcon />
                    </HeaderIconButton>
                </div>
            </SidebarHeader>
            <SidebarContent className="min-h-0">
                <div className="flex h-full min-h-0 flex-col">
                    {mode === 'list' ? (
                        <AssistantChatList
                            surface={surface}
                            activeChatId={chatId}
                            refreshNonce={refreshNonce}
                            onSelect={onSelectChat}
                            onNewChat={requestNewChat}
                            onRename={openRename}
                            onDelete={setDeleteChatId}
                        />
                    ) : chatId ? (
                        <ComposeActive
                            chatId={chatId}
                            surface={surface}
                            draft={draft}
                            onDraftChange={setDraft}
                            composerRef={composerRef}
                            onMessageSent={onMessageSent}
                            onBusyChange={setIsTurnBusy}
                            onTitleChange={setComposeTitle}
                            onChatMissing={doNewChat}
                            refreshNonce={refreshNonce}
                        />
                    ) : (
                        <ComposeEmpty
                            surface={surface}
                            path={path}
                            draft={draft}
                            onDraftChange={setDraft}
                            composerRef={composerRef}
                            onMessageSent={onMessageSent}
                            onSuggest={onSuggest}
                            onContinue={onSelectChat}
                            refreshNonce={refreshNonce}
                            railOpen={railOpen}
                        />
                    )}
                </div>
            </SidebarContent>

            <AlertDialog open={confirmNewChatOpen} onOpenChange={setConfirmNewChatOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{assistantSidebarLabels.leaveRunningTitle[locale]}</AlertDialogTitle>
                        <AlertDialogDescription>{assistantSidebarLabels.leaveRunningDescription[locale]}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{assistantSidebarLabels.cancel[locale]}</AlertDialogCancel>
                        <AlertDialogAction onClick={doNewChat}>{assistantSidebarLabels.leaveRunningConfirm[locale]}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={renameChatId != null} onOpenChange={(openDialog) => !openDialog && setRenameChatId(undefined)}>
                <DialogContent showCloseButton className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{assistantSidebarLabels.renameTitle[locale]}</DialogTitle>
                    </DialogHeader>
                    <Input
                        value={renameDraft}
                        onChange={(event) => setRenameDraft(event.target.value)}
                        placeholder={assistantSidebarLabels.renamePlaceholder[locale]}
                        maxLength={60}
                        autoFocus
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                void saveRename();
                            }
                        }}
                    />
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setRenameChatId(undefined)}>
                            {assistantSidebarLabels.cancel[locale]}
                        </Button>
                        <Button type="button" disabled={!renameDraft.trim()} onClick={() => void saveRename()}>
                            {assistantSidebarLabels.renameSave[locale]}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={deleteChatId != null} onOpenChange={(openDialog) => !openDialog && setDeleteChatId(undefined)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{assistantSidebarLabels.deleteTitle[locale]}</AlertDialogTitle>
                        <AlertDialogDescription>{assistantSidebarLabels.deleteDescription[locale]}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{assistantSidebarLabels.cancel[locale]}</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={() => void confirmDelete()}>
                            {assistantSidebarLabels.deleteConfirm[locale]}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Sidebar>
    );
}

function HeaderIconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" onClick={onClick} aria-label={label}>
                    {children}
                </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{label}</TooltipContent>
        </Tooltip>
    );
}

function HeaderIconLink({
    label,
    to,
    params,
    onClick,
    children,
}: {
    label: string;
    to: ReturnType<typeof assistantChatIndexTo> | ReturnType<typeof assistantChatDetailTo>;
    params?: { chatId: string };
    onClick?: () => void;
    children: ReactNode;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" asChild>
                    <Link to={to} params={params} onClick={onClick} aria-label={label}>
                        {children}
                    </Link>
                </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{label}</TooltipContent>
        </Tooltip>
    );
}

function AssistantResizeHandle({
    widthRem,
    onWidthRemChange,
    onResizingChange,
}: {
    widthRem: number;
    onWidthRemChange: (rem: number) => void;
    onResizingChange: (resizing: boolean) => void;
}) {
    const locale = useLocale();
    const widthRemRef = useRef(widthRem);
    widthRemRef.current = widthRem;

    const onPointerDown = useCallback(
        (event: ReactPointerEvent<HTMLButtonElement>) => {
            event.preventDefault();
            const handle = event.currentTarget;
            handle.setPointerCapture(event.pointerId);
            const startX = event.clientX;
            const startRem = widthRemRef.current;
            const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
            onResizingChange(true);

            const onPointerMove = (moveEvent: PointerEvent) => {
                // Right rail: drag left → wider.
                const deltaRem = (startX - moveEvent.clientX) / rootFontSize;
                onWidthRemChange(clampAssistantSidebarWidthRem(startRem + deltaRem));
            };
            const onPointerUp = (upEvent: PointerEvent) => {
                handle.releasePointerCapture(upEvent.pointerId);
                handle.removeEventListener('pointermove', onPointerMove);
                handle.removeEventListener('pointerup', onPointerUp);
                handle.removeEventListener('pointercancel', onPointerUp);
                onResizingChange(false);
            };

            handle.addEventListener('pointermove', onPointerMove);
            handle.addEventListener('pointerup', onPointerUp);
            handle.addEventListener('pointercancel', onPointerUp);
        },
        [onResizingChange, onWidthRemChange],
    );

    return (
        <button
            type="button"
            aria-label={assistantSidebarLabels.resize[locale]}
            title={assistantSidebarLabels.resize[locale]}
            onPointerDown={onPointerDown}
            className="group/resize absolute inset-y-2 left-0 z-30 hidden w-4 -translate-x-1/2 cursor-ew-resize touch-none md:block"
        >
            <span
                aria-hidden
                className="absolute top-1/2 left-1/2 h-8 w-1 -translate-1/2 rounded-full bg-border transition-colors group-hover/resize:bg-muted-foreground/50 group-active/resize:bg-muted-foreground/70"
            />
        </button>
    );
}

function ComposeEmpty({
    surface,
    path,
    draft,
    onDraftChange,
    composerRef,
    onMessageSent,
    onSuggest,
    onContinue,
    refreshNonce,
    railOpen,
}: {
    surface: AssistantSidebarSurface;
    path: string;
    draft: string;
    onDraftChange: (value: string) => void;
    composerRef: RefObject<ChatComposerHandle | null>;
    onMessageSent: (chatId: string) => void;
    onSuggest: (text: string) => void;
    onContinue: (chatId: string) => void;
    refreshNonce: number;
    railOpen: boolean;
}) {
    const locale = useLocale();
    const blurb = ASSISTANT_EMPTY_COPY[surface].blurb[locale];
    const suggestions = assistantSidebarSuggestions(surface, path);
    const [{ data, fetching }, reexecute] = useQuery({
        query: UserAssistantChatsDocument,
        variables: { criterion: { surface, skip: 0, take: 1 } },
        requestPolicy: 'cache-and-network',
        pause: !railOpen,
    });
    const lastChat = data?.currentSession.user?.assistantChats?.[0];
    const showContinueSkeleton = railOpen && fetching && !lastChat;
    const showContinueEmpty = railOpen && !fetching && !lastChat;

    useEffect(() => {
        if (!railOpen || refreshNonce === 0) return;
        void reexecute({ requestPolicy: 'network-only' });
    }, [railOpen, refreshNonce, reexecute]);

    return (
        <>
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-4 py-8">
                <p className="max-w-xs text-center text-sm text-muted-foreground">{blurb}</p>
                {lastChat ? (
                    <Button type="button" variant="secondary" size="sm" className="max-w-sm" onClick={() => onContinue(lastChat.chatId)}>
                        <HistoryIcon />
                        <span className="truncate">
                            {assistantSidebarLabels.continueLast[locale]}
                            {': '}
                            {assistantChatTitle(lastChat.title, locale)}
                        </span>
                    </Button>
                ) : showContinueSkeleton ? (
                    <Skeleton className="h-8 w-56 max-w-sm" aria-hidden />
                ) : showContinueEmpty ? (
                    <p className="flex h-8 max-w-sm items-center justify-center text-center text-sm text-muted-foreground">
                        {assistantSidebarLabels.emptyList[locale]}
                    </p>
                ) : null}
                <div className="flex max-w-sm flex-wrap justify-center gap-2">
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
            <ComposerBar>
                <ChatComposer
                    ref={composerRef}
                    surface={surface}
                    value={draft}
                    onValueChange={onDraftChange}
                    onMessageSent={onMessageSent}
                    autoFocus
                />
            </ComposerBar>
        </>
    );
}

function ComposeActive({
    chatId,
    surface,
    draft,
    onDraftChange,
    composerRef,
    onMessageSent,
    onBusyChange,
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
    onBusyChange: (busy: boolean) => void;
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
        onBusyChange(isLocked);
    }, [isLocked, onBusyChange]);

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
            <ComposerBar>
                <ChatComposer
                    ref={composerRef}
                    chatId={chatId}
                    surface={surface}
                    value={draft}
                    onValueChange={onDraftChange}
                    onMessageSent={onMessageSent}
                    isLocked={isLocked}
                />
            </ComposerBar>
        </>
    );
}

function AssistantChatListSkeleton() {
    return (
        <div className="flex flex-col gap-0.5" aria-hidden>
            {Array.from({ length: LIST_SKELETON_ROWS }, (_, index) => (
                <div key={index} className="flex flex-col gap-1.5 rounded-md p-2">
                    <Skeleton className="h-4 w-[70%]" />
                    <Skeleton className="h-3 w-[35%]" />
                </div>
            ))}
        </div>
    );
}

function AssistantChatList({
    surface,
    activeChatId,
    refreshNonce,
    onSelect,
    onNewChat,
    onRename,
    onDelete,
}: {
    surface: AssistantSidebarSurface;
    activeChatId: string | undefined;
    refreshNonce: number;
    onSelect: (chatId: string) => void;
    onNewChat: () => void;
    onRename: (chatId: string, title: string) => void;
    onDelete: (chatId: string) => void;
}) {
    const locale = useLocale();
    const [take, setTake] = useState(LIST_PAGE_SIZE);
    const [searchDraft, setSearchDraft] = useState('');
    const debouncedSearch = useDebouncedValue(searchDraft, 300);
    const searchText = debouncedSearch.trim() || undefined;
    const [{ data, fetching, error }, reexecute] = useQuery({
        query: UserAssistantChatsDocument,
        variables: { criterion: { surface, skip: 0, take, searchText } },
        requestPolicy: 'cache-and-network',
    });
    const chats = data?.currentSession.user?.assistantChats ?? [];
    const canLoadMore = chats.length >= take;
    const showSkeleton = fetching && chats.length === 0;

    useEffect(() => {
        setTake(LIST_PAGE_SIZE);
    }, [searchText]);

    useEffect(() => {
        if (refreshNonce === 0) return;
        void reexecute({ requestPolicy: 'network-only' });
    }, [refreshNonce, reexecute]);

    if (error) {
        return (
            <div className="grid flex-1 place-items-center px-4 text-center text-sm text-destructive">
                {assistantSidebarLabels.listError[locale]}
            </div>
        );
    }

    const emptyLabel = searchText ? assistantSidebarLabels.searchEmpty[locale] : assistantSidebarLabels.emptyList[locale];

    return (
        <>
            <div className="shrink-0 border-b border-sidebar-border p-2">
                <Input
                    value={searchDraft}
                    onChange={(event) => setSearchDraft(event.target.value)}
                    placeholder={assistantSidebarLabels.searchPlaceholder[locale]}
                    aria-label={assistantSidebarLabels.searchPlaceholder[locale]}
                    className="h-8 bg-sidebar"
                />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
                {showSkeleton ? (
                    <AssistantChatListSkeleton />
                ) : chats.length === 0 ? (
                    <p className="px-2 py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>
                ) : (
                    <ul className="flex flex-col gap-0.5" role="list">
                        {chats.map((chat) => {
                            const isActive = chat.chatId === activeChatId;
                            return (
                                <li key={chat.chatId} className="group/chat-row relative">
                                    <button
                                        type="button"
                                        className="flex w-full flex-col gap-0.5 rounded-md p-2 pr-10 text-left text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium cursor-pointer"
                                        data-active={isActive || undefined}
                                        onClick={() => onSelect(chat.chatId)}
                                    >
                                        <span className="truncate">{assistantChatTitle(chat.title, locale)}</span>
                                        <span className="truncate text-xs text-muted-foreground">
                                            {formatChatRelativeTime(chat.lastModifiedAt, locale)}
                                        </span>
                                    </button>
                                    <div className="absolute top-1.5 right-1">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-7"
                                                    aria-label={assistantSidebarLabels.chatActions[locale]}
                                                    onClick={(event) => event.stopPropagation()}
                                                >
                                                    <EllipsisVerticalIcon />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="min-w-40">
                                                <DropdownMenuItem onSelect={() => onRename(chat.chatId, chat.title)}>
                                                    <PencilIcon />
                                                    {assistantSidebarLabels.rename[locale]}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem variant="destructive" onSelect={() => onDelete(chat.chatId)}>
                                                    <Trash2Icon />
                                                    {assistantSidebarLabels.delete[locale]}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
                {canLoadMore && !showSkeleton ? (
                    <div className="flex justify-center py-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={fetching}
                            onClick={() => setTake((current) => current + LIST_PAGE_SIZE)}
                        >
                            {assistantSidebarLabels.loadMore[locale]}
                        </Button>
                    </div>
                ) : null}
            </div>
            <div className="border-t border-sidebar-border p-3">
                <Button type="button" className="w-full" onClick={onNewChat}>
                    <SquarePenIcon />
                    {assistantSidebarLabels.newChat[locale]}
                </Button>
            </div>
        </>
    );
}

function ComposerBar({ children }: { children: ReactNode }) {
    return <div className="border-t border-sidebar-border px-3 pt-3 pb-(--chat-composer-pb)">{children}</div>;
}
