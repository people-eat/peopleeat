'use client';

import {
    MessageScroller as MessageScrollerPrimitive,
    useMessageScroller,
    useMessageScrollerScrollable,
    useMessageScrollerVisibility,
} from '@shadcn/react/message-scroller';
import { ArrowDownIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useLocale } from '../../hooks/useLocale';
import { cn } from '../../utils/cn';
import { Button } from './button';

// shadcn/ui `message-scroller` — anchored chat transcript viewport with
// stick-to-bottom follow, jump-to-latest, preserved position on prepended
// history, and per-message anchoring. Wrap in `MessageScrollerProvider`
// then compose `MessageScroller > MessageScrollerViewport > MessageScrollerContent`
// with `MessageScrollerItem` per turn. See docs/styles/chat.md.

function MessageScrollerProvider(props: ComponentProps<typeof MessageScrollerPrimitive.Provider>) {
    return <MessageScrollerPrimitive.Provider {...props} />;
}

function MessageScroller({ className, ...props }: ComponentProps<typeof MessageScrollerPrimitive.Root>) {
    return (
        <MessageScrollerPrimitive.Root
            data-slot="message-scroller"
            className={cn('group/message-scroller relative flex size-full min-h-0 flex-col overflow-hidden', className)}
            {...props}
        />
    );
}

function MessageScrollerViewport({ className, ...props }: ComponentProps<typeof MessageScrollerPrimitive.Viewport>) {
    return (
        <MessageScrollerPrimitive.Viewport
            data-slot="message-scroller-viewport"
            className={cn(
                // `scrollbar-gutter-stable` reserves the classic-scrollbar lane so
                // content width does not jump when overflow appears. Do NOT pair
                // that with `data-autoscrolling:scrollbar-none`: during streaming
                // follow-output the primitive toggles `data-autoscrolling` on every
                // programmatic scroll, `scrollbar-width: none` collapses the gutter,
                // and right-aligned bubbles shift left/right. See docs/styles/chat.md.
                'size-full min-h-0 min-w-0 scroll-fade-b scrollbar-thin scrollbar-gutter-stable overflow-y-auto overscroll-contain contain-content',
                className,
            )}
            {...props}
        />
    );
}

function MessageScrollerContent({ className, ...props }: ComponentProps<typeof MessageScrollerPrimitive.Content>) {
    return (
        <MessageScrollerPrimitive.Content
            data-slot="message-scroller-content"
            className={cn('flex h-max min-h-full flex-col gap-8', className)}
            {...props}
        />
    );
}

function MessageScrollerItem({ className, scrollAnchor = false, ...props }: ComponentProps<typeof MessageScrollerPrimitive.Item>) {
    return (
        <MessageScrollerPrimitive.Item
            data-slot="message-scroller-item"
            scrollAnchor={scrollAnchor}
            // Do NOT use `content-visibility:auto` here. Chat rows vary wildly
            // in height (date pills vs short bubbles vs voice notes / images);
            // a fixed `contain-intrinsic-size` estimate makes `scrollHeight`
            // thrash while scrolling up, which fights stick-to-bottom follow
            // and reads as flicker on every human transcript. `p-1` still
            // opens paint room for card shadows / outset focus rings clipped
            // by the viewport's `overflow-y-auto`; `-my-1` cancels that inset
            // on the scroll axis so the parent's `gap` stays exact. Horizontal
            // 4px stays as a plain inset (no negative margin) so the item
            // cannot grow wider than the viewport and trip overflow-x.
            className={cn('min-w-0 shrink-0 -my-1 p-1', className)}
            {...props}
        />
    );
}

function MessageScrollerButton({
    direction = 'end',
    className,
    children,
    render,
    variant = 'secondary',
    size = 'icon-sm',
    ...props
}: ComponentProps<typeof MessageScrollerPrimitive.Button> & Pick<ComponentProps<typeof Button>, 'variant' | 'size'>) {
    const locale = useLocale();
    const scrollLabel =
        direction === 'end'
            ? { de: 'Zum Ende scrollen', en: 'Scroll to end' }[locale]
            : { de: 'Zum Anfang scrollen', en: 'Scroll to start' }[locale];

    return (
        <MessageScrollerPrimitive.Button
            data-slot="message-scroller-button"
            data-direction={direction}
            data-variant={variant}
            data-size={size}
            direction={direction}
            className={cn(
                'absolute inset-s-1/2 -translate-x-1/2 border-border bg-background text-foreground transition-[translate,scale,opacity] duration-200 hover:bg-muted hover:text-foreground motion-reduce:transition-none data-[active=false]:pointer-events-none data-[active=false]:scale-95 data-[active=false]:opacity-0 data-[active=false]:duration-400 data-[active=false]:ease-[cubic-bezier(0.7,0,0.84,0)] motion-reduce:data-[active=false]:scale-100 motion-reduce:data-[active=false]:duration-0 data-[active=true]:translate-y-0 data-[active=true]:scale-100 data-[active=true]:opacity-100 data-[active=true]:ease-[cubic-bezier(0.23,1,0.32,1)] data-[direction=end]:bottom-4 data-[direction=end]:data-[active=false]:translate-y-full motion-reduce:data-[direction=end]:data-[active=false]:translate-y-0 data-[direction=start]:top-4 data-[direction=start]:data-[active=false]:-translate-y-full motion-reduce:data-[direction=start]:data-[active=false]:translate-y-0 rtl:translate-x-1/2 data-[direction=start]:[&_svg]:rotate-180',
                className,
            )}
            render={render ?? <Button variant={variant} size={size} />}
            {...props}
        >
            {children ?? (
                <>
                    <ArrowDownIcon />
                    <span className="sr-only">{scrollLabel}</span>
                </>
            )}
        </MessageScrollerPrimitive.Button>
    );
}

export {
    MessageScroller,
    MessageScrollerButton,
    MessageScrollerContent,
    MessageScrollerItem,
    MessageScrollerProvider,
    MessageScrollerViewport,
    useMessageScroller,
    useMessageScrollerScrollable,
    useMessageScrollerVisibility,
};
