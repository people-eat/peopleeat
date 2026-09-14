import type { PropsWithChildren, ReactNode } from 'react';

import { cn } from '../utils/cn';

/**
 * Viewport-pinned action footer for profile shell pages.
 * Fills the cook/customer inset pane, scrolls the body, and keeps `footer` glued
 * to the bottom — do not use CSS `sticky bottom-0` for shell action bars.
 *
 * Set `contentScroll={false}` when a child owns the scrollport (offer chat / tab
 * panels). Otherwise this wrapper reserves `scrollbar-gutter: stable` for an
 * idle classic-scrollbar lane that shows up as empty space on the right.
 */
export function ProfilePinnedFooterLayout({
    children,
    footer,
    className,
    contentClassName,
    contentScroll = true,
}: PropsWithChildren<{
    footer?: ReactNode;
    className?: string;
    contentClassName?: string;
    contentScroll?: boolean;
}>) {
    return (
        <main
            id="main-content"
            data-pinned-footer-layout=""
            className={cn(
                'grid min-h-0 w-[calc(100%+2rem)] min-w-0 max-w-none flex-1 -mx-4 overflow-hidden',
                footer != null ? 'grid-rows-[1fr_auto]' : 'grid-rows-[1fr]',
                className,
            )}
        >
            <div
                className={cn(
                    'min-h-0',
                    // Nested tab/chat scrollports must own horizontal padding — a padded
                    // parent leaves the scrollbar inset from the pane edge (obvious on mobile).
                    contentScroll ? 'overflow-y-auto overscroll-contain px-4 scrollbar-gutter-stable' : 'overflow-hidden px-0',
                    // Keep `pb-*` on this block scrollport — Chromium drops padding-bottom when
                    // the same node is also `display: grid` / `flex` (via contentClassName).
                    contentScroll ? (footer != null ? 'pb-10' : 'pb-6') : 'pb-0',
                )}
            >
                <div className={cn(!contentScroll && 'h-full min-h-0', contentClassName)}>{children}</div>
            </div>
            {footer != null ? (
                <div className="shrink-0 border-t bg-background px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">{footer}</div>
                </div>
            ) : null}
        </main>
    );
}
