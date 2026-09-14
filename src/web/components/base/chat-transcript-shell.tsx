import type { PropsWithChildren } from 'react';
import { useLocale } from '../../hooks/useLocale';
import { cn } from '../../utils/cn';
import {
    MessageScroller,
    MessageScrollerButton,
    MessageScrollerContent,
    MessageScrollerProvider,
    MessageScrollerViewport,
} from './message-scroller';

// Shared scaffolding every chat transcript in the app sits on top of. Pins
// scroll config per mode in exactly one place — assistant (`last-anchor` turn
// focus) vs human (`end` messenger stick-to-bottom) — plus the shared
// `scrollEdgeThreshold={64}`, `autoScroll`, and jump-to-latest pill, so a new
// surface can't drift by forgetting one. See docs/styles/chat.md.

/** Transcript scroll mode. Assistant = AI turn focus; human = peer messenger. */
export type ChatTranscriptShellMode = 'assistant' | 'human';

/** Transcript shell props. Every scroll-managed row MUST be a direct
 *  `MessageScrollerItem` child of Content — wrappers (`<section>`,
 *  live-region divs) break turn anchoring and stick-to-bottom. See
 *  docs/styles/chat.md. */
export interface ChatTranscriptShellProps extends PropsWithChildren {
    /** Localised label for the SR-only text on the jump-to-latest pill.
     *  Required — every surface knows its own locale. */
    jumpToLatestLabel: string;
    /** Accessible name for the messages region. Defaults via `useLocale`
     *  to "Nachrichten" / "Messages". */
    messagesAriaLabel?: string;
    /** Transcript scroll mode. Defaults to `assistant` (last-anchor turn
     *  focus). Pass `human` for offer / support peer threads. */
    mode?: ChatTranscriptShellMode;
    /** Extra className on the outer `MessageScroller`. */
    className?: string;
    /** Extra className on the inner `MessageScrollerViewport`. */
    viewportClassName?: string;
    /** Extra className on `MessageScrollerContent`. Chat transcripts pass
     *  `gap-4` so row spacing matches `--chat-row-gap`; the primitive default
     *  is `gap-8`. */
    contentClassName?: string;
}

export function ChatTranscriptShell({
    jumpToLatestLabel,
    messagesAriaLabel,
    mode = 'assistant',
    className,
    viewportClassName,
    contentClassName,
    children,
}: ChatTranscriptShellProps) {
    const locale = useLocale();
    const regionLabel = messagesAriaLabel ?? { de: 'Nachrichten', en: 'Messages' }[locale];
    const isAssistant = mode === 'assistant';

    return (
        <MessageScrollerProvider
            // Follow the live edge as new messages / streamed chunks land, but
            // only while the reader is AT the edge — the primitive stops
            // following the moment they scroll up, select text, or open a link
            // (gated by `scrollEdgeThreshold`). Off by default in the
            // primitive, so it must be set explicitly or the transcript never
            // sticks to the bottom during streaming. See docs/styles/chat.md.
            autoScroll
            // Assistant: open saved conversations at the last meaningful turn
            // (usually the last user message). Human: open at absolute bottom
            // (latest message). See docs/styles/chat.md.
            defaultScrollPosition={isAssistant ? 'last-anchor' : 'end'}
            // 64 px absorbs Streamdown's sub-pixel content-height jitter
            // while streaming without dropping stick mode. Any smaller
            // chatters; larger and casual scroll-ups look like the reader
            // is still at the bottom.
            scrollEdgeThreshold={64}
            // Assistant only: primitive default is 64 px of the previous item
            // peeking above a new turn anchor. We want the new user message
            // flush at the top so the prior reply leaves the viewport entirely.
            // Irrelevant in human mode (no scrollAnchor).
            {...(isAssistant ? { scrollPreviousItemPeek: 0 } : {})}
        >
            <MessageScroller className={className}>
                {/*
                 * `scrollbar-gutter: stable` reserves the scrollbar column in
                 * its own lane so the vertical scrollbar never overlaps the
                 * rightmost user bubbles when it appears. Left inset is `pl-2`;
                 * the right side stays flush (`pr-0`) because each
                 * `MessageScrollerItem` already has horizontal `p-1` for shadow
                 * / focus-ring bleed — stacking `pr-2` on top of that made the
                 * assistant rail look padded twice next to the gutter. Baked in
                 * here so every surface inherits the same treatment; a surface
                 * can only widen the gutter via `viewportClassName`, never turn
                 * it off. See docs/styles/chat.md ("Scrollbar gutter").
                 */}
                <MessageScrollerViewport className={cn('scrollbar-gutter-stable pl-2 pr-0', viewportClassName)} aria-label={regionLabel}>
                    <MessageScrollerContent className={contentClassName}>{children}</MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton direction="end" variant="secondary" size="sm" className="gap-1.5 rounded-full px-3 text-xs">
                    {jumpToLatestLabel}
                </MessageScrollerButton>
            </MessageScroller>
        </MessageScrollerProvider>
    );
}
