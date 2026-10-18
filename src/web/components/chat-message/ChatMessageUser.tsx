import { ChevronDownIcon, PencilIcon, SmilePlusIcon } from 'lucide-react';
import type { TransitionEvent } from 'react';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { containsPhoneNumber } from '../../../shared';
import type { GqlCChatMessageUser } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { cn } from '../../utils/cn';
import { Avatar, AvatarFallback, AvatarImage } from '../base/avatar';
import { Button } from '../base/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../base/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../base/popover';
import { StatusAlert } from '../base/status-alert';
import { Textarea } from '../base/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '../base/tooltip';
import { ChatAttachmentPreviewDialog } from './ChatAttachmentPreviewDialog';
import { ChatAttachmentTileGrid } from './ChatAttachmentTileGrid';
import { Bubble, CopyButton, MessageRow, Timestamp } from './shared';

/** WhatsApp-style quick reactions offered in the Concierge picker. */
const QUICK_REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const;

function initialsFromName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]!.slice(0, 1)}${parts[parts.length - 1]!.slice(0, 1)}`.toUpperCase();
}

export function ChatMessageUserView({
    message,
    showAuthorName = true,
    showAuthorAvatar = true,
    onEdit,
    onReact,
}: {
    message: GqlCChatMessageUser;
    /** Peer only: name inside the first bubble of a same-author streak. */
    showAuthorName?: boolean;
    /** Peer only: avatar bottom-aligned on the last bubble of a streak. */
    showAuthorAvatar?: boolean;
    /** When set, shows an edit control that saves a new body via this callback. */
    onEdit?: (body: string) => Promise<boolean>;
    /**
     * When set on peer messages, shows a reaction picker. Pass `''` to clear the
     * viewer's reaction. Clicking the current emoji again clears it.
     */
    onReact?: (emoji: string) => Promise<boolean>;
}) {
    const locale = useLocale();
    const hasAttachments = message.attachments.length > 0;
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewIndex, setPreviewIndex] = useState(0);
    const [editOpen, setEditOpen] = useState(false);
    const [editDraft, setEditDraft] = useState(message.body);
    const [editBusy, setEditBusy] = useState(false);
    const [reactOpen, setReactOpen] = useState(false);
    const [reactBusy, setReactBusy] = useState(false);
    const isOwn = message.isOwn;
    const side = isOwn ? 'user' : 'assistant';
    const tone = isOwn ? 'user' : 'assistant';
    const editContainsPhoneNumber = containsPhoneNumber(editDraft);
    const editEmptyBlocked = editDraft.trim().length === 0 && !hasAttachments;
    const editLabel = { de: 'Nachricht bearbeiten', en: 'Edit message' }[locale];
    const reactLabel = { de: 'Reagieren', en: 'React' }[locale];
    const ownReactionEmoji = message.reactions.find((reaction) => reaction.isOwn)?.emoji;

    useEffect(() => {
        if (editOpen) setEditDraft(message.body);
    }, [editOpen, message.body]);

    const openPreviewAt = (index: number) => {
        setPreviewIndex(index);
        setPreviewOpen(true);
    };

    const preview = hasAttachments ? (
        <ChatAttachmentPreviewDialog
            open={previewOpen}
            onOpenChange={setPreviewOpen}
            attachments={message.attachments}
            index={previewIndex}
            onIndexChange={setPreviewIndex}
        />
    ) : null;

    const editDialog =
        onEdit != null ? (
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editLabel}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3">
                        {editContainsPhoneNumber ? (
                            <StatusAlert tone="warning">
                                {
                                    {
                                        de: 'Das Teilen von Telefonnummern ist nicht erlaubt. Bitte bleibe für Absprachen hier im Chat.',
                                        en: 'Sharing phone numbers is not allowed. Please keep arrangements in this chat.',
                                    }[locale]
                                }
                            </StatusAlert>
                        ) : null}
                        <Textarea
                            value={editDraft}
                            onChange={(event) => setEditDraft(event.target.value)}
                            rows={5}
                            disabled={editBusy}
                            aria-label={editLabel}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" disabled={editBusy} onClick={() => setEditOpen(false)}>
                            {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                        </Button>
                        <Button
                            type="button"
                            disabled={editBusy || editContainsPhoneNumber || editEmptyBlocked}
                            onClick={() => {
                                void (async () => {
                                    if (editBusy || editContainsPhoneNumber || editEmptyBlocked || onEdit == null) return;
                                    setEditBusy(true);
                                    try {
                                        const ok = await onEdit(editDraft.trim());
                                        if (ok) setEditOpen(false);
                                    } finally {
                                        setEditBusy(false);
                                    }
                                })();
                            }}
                        >
                            {{ de: 'Speichern', en: 'Save' }[locale]}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        ) : null;

    const bubbleInner = (
        <>
            {!isOwn && showAuthorName ? (
                <p className="mb-0.5 truncate text-[11px] leading-tight font-semibold text-primary">{message.author.display}</p>
            ) : null}
            {hasAttachments ? (
                <div className="mb-2">
                    <ChatAttachmentTileGrid attachments={message.attachments} onTileClick={openPreviewAt} />
                </div>
            ) : null}
            <div className="flex items-end gap-2">
                {message.body.length > 0 ? (
                    <div className="min-w-0 flex-1">
                        <UserMessageBody body={message.body} tone={tone} collapseLongBody={message.collapseLongBody} />
                    </div>
                ) : (
                    <span className="min-w-0 flex-1" />
                )}
                <span
                    className={cn(
                        'inline-flex shrink-0 items-center gap-0.5 pb-px',
                        tone === 'user' ? 'text-primary-foreground/65' : 'text-muted-foreground',
                    )}
                >
                    <Timestamp
                        iso={message.createdAt}
                        className={cn('mt-0 inline text-[10px]/none opacity-100', tone === 'user' && 'text-primary-foreground/65')}
                    />
                    {isOwn && message.deliveryStatus ? (
                        <span
                            className="text-[10px] tracking-wide uppercase"
                            title={message.deliveryStatus}
                            aria-label={message.deliveryStatus}
                        >
                            {message.deliveryStatus === 'FAILED'
                                ? '!'
                                : message.deliveryStatus === 'READ'
                                  ? '✓✓'
                                  : message.deliveryStatus === 'DELIVERED'
                                    ? '✓✓'
                                    : '✓'}
                        </span>
                    ) : null}
                    {message.showCopyButton && message.body.length > 0 ? <CopyButton text={message.body} /> : null}
                    {onEdit != null ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-xs"
                                    aria-label={editLabel}
                                    onClick={() => setEditOpen(true)}
                                    className={cn(
                                        'opacity-70 hover:opacity-100',
                                        tone === 'user' &&
                                            'text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground',
                                    )}
                                >
                                    <PencilIcon aria-hidden />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>{editLabel}</TooltipContent>
                        </Tooltip>
                    ) : null}
                </span>
            </div>
        </>
    );

    const applyReaction = async (emoji: string) => {
        if (!onReact || reactBusy) return;
        const next = ownReactionEmoji === emoji ? '' : emoji;
        setReactBusy(true);
        try {
            const ok = await onReact(next);
            if (ok) setReactOpen(false);
        } finally {
            setReactBusy(false);
        }
    };

    const reactionPicker =
        !isOwn && onReact != null ? (
            <Popover open={reactOpen} onOpenChange={setReactOpen}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                aria-label={reactLabel}
                                disabled={reactBusy}
                                className="mb-0.5 shrink-0 opacity-70 hover:opacity-100"
                            >
                                <SmilePlusIcon aria-hidden />
                            </Button>
                        </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>{reactLabel}</TooltipContent>
                </Tooltip>
                <PopoverContent align="start" side="top" className="w-auto p-1.5">
                    <div className="flex items-center gap-0.5" role="listbox" aria-label={reactLabel}>
                        {QUICK_REACTION_EMOJIS.map((emoji) => {
                            const selected = ownReactionEmoji === emoji;
                            return (
                                <button
                                    key={emoji}
                                    type="button"
                                    role="option"
                                    aria-selected={selected}
                                    disabled={reactBusy}
                                    aria-label={
                                        selected
                                            ? { de: `${emoji} entfernen`, en: `Remove ${emoji}` }[locale]
                                            : { de: `Mit ${emoji} reagieren`, en: `React with ${emoji}` }[locale]
                                    }
                                    onClick={() => {
                                        void applyReaction(emoji);
                                    }}
                                    className={cn(
                                        'flex size-9 items-center justify-center rounded-md text-lg leading-none',
                                        'hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                                        selected && 'bg-foreground/8 ring-1 ring-border',
                                        reactBusy && 'opacity-50',
                                    )}
                                >
                                    {emoji}
                                </button>
                            );
                        })}
                    </div>
                </PopoverContent>
            </Popover>
        ) : null;

    const reactionBadges =
        message.reactions.length > 0 ? (
            <div
                className={cn('z-10 -mt-2 flex flex-wrap gap-0.5', isOwn ? 'mr-1 justify-end' : 'ml-8 justify-start')}
                aria-label={{ de: 'Reaktionen', en: 'Reactions' }[locale]}
            >
                {message.reactions.map((reaction) => (
                    <span
                        key={`${reaction.emoji}-${reaction.isOwn ? 'own' : 'peer'}`}
                        className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full border border-border/80 bg-background px-1.5 text-sm leading-none shadow-sm"
                        title={reaction.isOwn ? { de: 'Deine Reaktion', en: 'Your reaction' }[locale] : undefined}
                    >
                        {reaction.emoji}
                    </span>
                ))}
            </div>
        ) : null;

    if (isOwn) {
        return (
            <MessageRow side={side}>
                <div className="group/msg flex w-full max-w-full flex-col items-end">
                    <Bubble tone={tone}>{bubbleInner}</Bubble>
                    {reactionBadges}
                    {preview}
                    {editDialog}
                </div>
            </MessageRow>
        );
    }

    // Modern WhatsApp peer streak: author name inside the first bubble; avatar
    // only on the last bubble, bottom-aligned; mid-streak rows keep a spacer.
    return (
        <MessageRow side={side}>
            <div className="group/msg flex w-full min-w-0 flex-col">
                <div className="flex items-end gap-2">
                    <div className="flex size-6 shrink-0 items-end justify-center" aria-hidden={!showAuthorAvatar}>
                        {showAuthorAvatar ? (
                            <Avatar size="sm">
                                {message.author.profilePicture != null ? (
                                    <AvatarImage src={message.author.profilePicture.url} alt="" />
                                ) : null}
                                <AvatarFallback className="bg-foreground/10 text-[10px] font-semibold text-foreground/75">
                                    {initialsFromName(message.author.display)}
                                </AvatarFallback>
                            </Avatar>
                        ) : (
                            <span className="size-6" />
                        )}
                    </div>
                    <Bubble tone={tone} tail={showAuthorAvatar}>
                        {bubbleInner}
                    </Bubble>
                    {reactionPicker}
                </div>
                {reactionBadges}
                {preview}
                {editDialog}
            </div>
        </MessageRow>
    );
}

function UserMessageBody({ body, tone, collapseLongBody }: { body: string; tone: 'user' | 'assistant'; collapseLongBody: boolean }) {
    const locale = useLocale();
    const panelId = useId();
    const [expanded, setExpanded] = useState(false);
    const [animate, setAnimate] = useState(false);
    const [canExpand, setCanExpand] = useState(false);
    const [collapsedH, setCollapsedH] = useState(0);
    const [fullH, setFullH] = useState(0);
    const contentRef = useRef<HTMLDivElement>(null);
    const interactive = collapseLongBody && (canExpand || expanded);

    const measure = useCallback(() => {
        if (!collapseLongBody) {
            setCanExpand(false);
            return;
        }
        const el = contentRef.current;
        if (!el) return;
        const full = el.scrollHeight;
        const lh = Math.ceil(parseFloat(getComputedStyle(el).lineHeight) || 22);
        const collapsed = lh * 2;
        setFullH(full);
        setCollapsedH(collapsed);
        setCanExpand(full > collapsed + 1);
    }, [collapseLongBody]);

    useLayoutEffect(() => {
        measure();
        const el = contentRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        return () => observer.disconnect();
    }, [body, measure]);

    if (!collapseLongBody) {
        return <div className="min-w-0 w-full whitespace-pre-wrap wrap-break-word">{body}</div>;
    }

    const onToggle = () => {
        if (expanded) {
            const el = contentRef.current;
            if (el) setFullH(el.scrollHeight);
            setAnimate(true);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setExpanded(false));
            });
            return;
        }
        setAnimate(true);
        setExpanded(true);
    };

    const onTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
        if (event.propertyName !== 'max-height') return;
        setAnimate(false);
        measure();
    };

    const maxHeight = !interactive || collapsedH === 0 ? undefined : expanded ? (animate ? fullH : undefined) : collapsedH;
    const label = expanded ? { de: 'Weniger anzeigen', en: 'Show less' }[locale] : { de: 'Mehr anzeigen', en: 'Show more' }[locale];

    return (
        <div className="flex flex-col items-end">
            <div
                id={panelId}
                className={cn(
                    'min-w-0 w-full overflow-hidden wrap-break-word',
                    !expanded && !animate && 'line-clamp-2',
                    animate && 'transition-[max-height] duration-200 ease-out motion-reduce:transition-none',
                )}
                style={maxHeight != null ? { maxHeight } : undefined}
                onTransitionEnd={onTransitionEnd}
            >
                <div ref={contentRef} className="whitespace-pre-wrap wrap-break-word">
                    {body}
                </div>
            </div>
            {interactive ? (
                <button
                    type="button"
                    onClick={onToggle}
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    aria-label={label}
                    className={cn(
                        '-mb-1 -mr-1 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md',
                        tone === 'user'
                            ? 'text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground active:bg-primary-foreground/20 active:text-primary-foreground'
                            : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground active:bg-foreground/10 active:text-foreground',
                        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                    )}
                >
                    <ChevronDownIcon
                        aria-hidden
                        className={cn(
                            'size-3.5 transition-transform duration-200 ease-out motion-reduce:transition-none',
                            expanded && 'rotate-180',
                        )}
                    />
                </button>
            ) : null}
        </div>
    );
}
