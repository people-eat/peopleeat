import type { KeyboardEvent, ReactNode, TransitionEvent } from 'react';
import { useCallback, useId, useLayoutEffect, useRef, useState } from 'react';

import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';

function lineHeightPx(el: HTMLElement): number {
    const computed = getComputedStyle(el);
    const raw = computed.lineHeight;
    if (raw === 'normal' || raw === '') {
        return Math.ceil((Number.parseFloat(computed.fontSize) || 14) * 1.5);
    }
    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return Math.ceil((Number.parseFloat(computed.fontSize) || 14) * 1.5);
    }
    if (parsed < 4) {
        return Math.ceil((Number.parseFloat(computed.fontSize) || 14) * parsed);
    }
    return Math.ceil(parsed);
}

export function ExpandableText({
    children,
    visibleLines = 3,
    className,
}: {
    children: ReactNode;
    visibleLines?: number;
    className?: string;
}) {
    const locale = useLocale();
    const panelId = useId();
    const contentRef = useRef<HTMLDivElement>(null);
    const [expanded, setExpanded] = useState(false);
    const [animate, setAnimate] = useState(false);
    const [collapsedH, setCollapsedH] = useState(0);
    const [fullH, setFullH] = useState(0);
    const [canExpand, setCanExpand] = useState(false);

    const measure = useCallback(() => {
        const el = contentRef.current;
        if (el == null) return;
        const collapsed = lineHeightPx(el) * visibleLines;
        const full = el.scrollHeight;
        setCollapsedH(collapsed);
        setFullH(full);
        setCanExpand(full > collapsed + 1);
    }, [visibleLines]);

    useLayoutEffect(() => {
        setExpanded(false);
        setAnimate(false);
        measure();
        const el = contentRef.current;
        if (el == null || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(() => measure());
        observer.observe(el);
        return () => observer.disconnect();
    }, [children, measure]);

    const interactive = canExpand || expanded;
    const label = expanded ? { de: 'Weniger anzeigen', en: 'Show less' }[locale] : { de: 'Mehr anzeigen', en: 'Show more' }[locale];

    function onToggle() {
        if (!canExpand && !expanded) return;
        if (expanded) {
            const el = contentRef.current;
            if (el != null) setFullH(el.scrollHeight);
            setAnimate(true);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setExpanded(false));
            });
            return;
        }
        setAnimate(true);
        setExpanded(true);
    }

    function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (!interactive) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onToggle();
    }

    function onTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
        if (event.propertyName !== 'max-height') return;
        setAnimate(false);
        measure();
    }

    const maxHeight = !interactive || collapsedH === 0 ? undefined : expanded ? (animate ? fullH : undefined) : collapsedH;

    return (
        <div
            className={cn(
                'w-full min-w-0',
                interactive && 'cursor-pointer rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
            )}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-expanded={interactive ? expanded : undefined}
            aria-controls={interactive ? panelId : undefined}
            aria-label={interactive ? label : undefined}
            onClick={interactive ? onToggle : undefined}
            onKeyDown={interactive ? onKeyDown : undefined}
        >
            <div
                id={panelId}
                className={cn(
                    'relative min-w-0 overflow-hidden',
                    animate && 'transition-[max-height] duration-300 ease-out motion-reduce:transition-none',
                )}
                style={maxHeight != null ? { maxHeight } : undefined}
                onTransitionEnd={onTransitionEnd}
            >
                <div ref={contentRef} className={cn('whitespace-pre-wrap wrap-break-word', className)}>
                    {children}
                </div>
                {interactive && !expanded ? (
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-linear-to-t from-background to-transparent"
                    />
                ) : null}
            </div>
        </div>
    );
}
