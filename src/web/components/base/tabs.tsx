import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Tabs as TabsPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { useEffect, useRef, useState } from 'react';

import { useLocale } from '../../hooks/useLocale';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { cn } from '../../utils/cn';
import { Button } from './button';

function Tabs({ className, orientation = 'horizontal', ...props }: ComponentProps<typeof TabsPrimitive.Root>) {
    return (
        <TabsPrimitive.Root
            data-slot="tabs"
            data-orientation={orientation}
            orientation={orientation}
            className={cn('group/tabs flex min-w-0 gap-2 data-[orientation=horizontal]:flex-col', className)}
            {...props}
        />
    );
}

const tabsListVariants = cva(
    'group/tabs-list inline-flex w-fit items-center justify-start rounded-lg p-[3px] text-muted-foreground group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none',
    {
        variants: {
            variant: {
                default: 'bg-muted',
                line: 'gap-1 bg-transparent',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    },
);

const SCROLL_EDGE_EPSILON_PX = 1;

function tabsListScrollEdges(el: HTMLElement): { canScrollStart: boolean; canScrollEnd: boolean } {
    const { scrollLeft, scrollWidth, clientWidth } = el;
    return {
        canScrollStart: scrollLeft > SCROLL_EDGE_EPSILON_PX,
        canScrollEnd: scrollLeft + clientWidth < scrollWidth - SCROLL_EDGE_EPSILON_PX,
    };
}

function TabsList({
    className,
    variant = 'default',
    ...props
}: ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>) {
    const locale = useLocale();
    const prefersReducedMotion = usePrefersReducedMotion();
    const scrollerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const [canScrollStart, setCanScrollStart] = useState(false);
    const [canScrollEnd, setCanScrollEnd] = useState(false);

    useEffect(() => {
        const scroller = scrollerRef.current;
        const list = listRef.current;
        if (scroller == null) return;

        const updateScrollState = () => {
            const edges = tabsListScrollEdges(scroller);
            setCanScrollStart(edges.canScrollStart);
            setCanScrollEnd(edges.canScrollEnd);
        };

        updateScrollState();

        scroller.addEventListener('scroll', updateScrollState, { passive: true });

        const resizeObserver =
            typeof ResizeObserver === 'undefined'
                ? null
                : new ResizeObserver(() => {
                      updateScrollState();
                  });
        resizeObserver?.observe(scroller);
        if (list != null) resizeObserver?.observe(list);

        const onWheel = (event: WheelEvent) => {
            if (scroller.scrollWidth <= scroller.clientWidth) return;
            if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
            const edges = tabsListScrollEdges(scroller);
            if (event.deltaY < 0 && !edges.canScrollStart) return;
            if (event.deltaY > 0 && !edges.canScrollEnd) return;
            scroller.scrollLeft += event.deltaY;
            event.preventDefault();
        };
        scroller.addEventListener('wheel', onWheel, { passive: false });

        return () => {
            scroller.removeEventListener('scroll', updateScrollState);
            scroller.removeEventListener('wheel', onWheel);
            resizeObserver?.disconnect();
        };
    }, []);

    const scrollByPage = (direction: -1 | 1) => {
        const scroller = scrollerRef.current;
        if (scroller == null) return;
        scroller.scrollBy({
            left: direction * scroller.clientWidth * 0.8,
            behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });
    };

    return (
        <div className="relative min-w-0 max-w-full">
            {canScrollStart ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    tabIndex={-1}
                    className="absolute top-4 left-0 z-10 -translate-y-1/2 bg-background/80 text-muted-foreground shadow-sm hover:text-foreground"
                    aria-label={{ de: 'Tabs nach links scrollen', en: 'Scroll tabs left' }[locale]}
                    onClick={() => scrollByPage(-1)}
                >
                    <ChevronLeftIcon aria-hidden />
                </Button>
            ) : null}
            {canScrollEnd ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    tabIndex={-1}
                    className="absolute top-4 right-0 z-10 -translate-y-1/2 bg-background/80 text-muted-foreground shadow-sm hover:text-foreground"
                    aria-label={{ de: 'Tabs nach rechts scrollen', en: 'Scroll tabs right' }[locale]}
                    onClick={() => scrollByPage(1)}
                >
                    <ChevronRightIcon aria-hidden />
                </Button>
            ) : null}
            <div
                ref={scrollerRef}
                className={cn(
                    'min-w-0 max-w-full scroll-fade-x',
                    'group-data-[orientation=horizontal]/tabs:overflow-x-auto group-data-[orientation=horizontal]/tabs:overflow-y-hidden group-data-[orientation=horizontal]/tabs:overscroll-x-contain group-data-[orientation=horizontal]/tabs:no-scrollbar',
                    variant === 'line' && 'group-data-[orientation=horizontal]/tabs:pb-[5px]',
                )}
            >
                <TabsPrimitive.List
                    ref={listRef}
                    data-slot="tabs-list"
                    data-variant={variant}
                    className={cn(tabsListVariants({ variant }), className)}
                    {...props}
                />
            </div>
        </div>
    );
}

function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
    return (
        <TabsPrimitive.Trigger
            data-slot="tabs-trigger"
            className={cn(
                "relative inline-flex h-[calc(100%-1px)] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-[color,background-color,border-color,box-shadow,opacity] outline-none group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 active:bg-muted/80 disabled:pointer-events-none disabled:opacity-50 group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                'group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:hover:bg-muted group-data-[variant=line]/tabs-list:data-[state=active]:active:bg-muted/80 dark:group-data-[variant=line]/tabs-list:data-[state=active]:border-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:hover:bg-muted dark:group-data-[variant=line]/tabs-list:data-[state=active]:active:bg-muted/80',
                'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:hover:bg-muted data-[state=active]:active:bg-muted/80 dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:data-[state=active]:text-foreground dark:data-[state=active]:hover:bg-muted dark:data-[state=active]:active:bg-muted/80',
                'after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100',
                className,
            )}
            {...props}
        />
    );
}

function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
    return <TabsPrimitive.Content data-slot="tabs-content" className={cn('flex-1 outline-none', className)} {...props} />;
}

export { Tabs, TabsContent, TabsList, tabsListVariants, TabsTrigger };
