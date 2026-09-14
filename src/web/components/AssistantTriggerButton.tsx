import { BotMessageSquareIcon } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';

import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { cn } from '../utils/cn';
import { roundedRectPath } from '../utils/roundedRectPath';
import type { CornerRadii } from '../utils/roundedRectPath';
import { Button } from './base/button';
import { useSidebar } from './base/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from './base/tooltip';

const ORBIT_STROKE_WIDTH = 1.5;
const ORBIT_OUTSET = 1;

type OrbitGeometry = {
    width: number;
    height: number;
    path: string;
};

function readCornerRadii(element: HTMLElement): CornerRadii {
    const style = getComputedStyle(element);
    return {
        topLeft: Number.parseFloat(style.borderTopLeftRadius) || 0,
        topRight: Number.parseFloat(style.borderTopRightRadius) || 0,
        bottomRight: Number.parseFloat(style.borderBottomRightRadius) || 0,
        bottomLeft: Number.parseFloat(style.borderBottomLeftRadius) || 0,
    };
}

function measureOrbitGeometry(element: HTMLElement): OrbitGeometry | null {
    const rect = element.getBoundingClientRect();
    const width = rect.width + ORBIT_OUTSET * 2;
    const height = rect.height + ORBIT_OUTSET * 2;
    if (width <= 0 || height <= 0) return null;

    const radii = readCornerRadii(element);
    const pathRadii: CornerRadii = {
        topLeft: radii.topLeft + ORBIT_OUTSET,
        topRight: radii.topRight + ORBIT_OUTSET,
        bottomRight: radii.bottomRight + ORBIT_OUTSET,
        bottomLeft: radii.bottomLeft + ORBIT_OUTSET,
    };
    const path = roundedRectPath(width, height, pathRadii, ORBIT_STROKE_WIDTH / 2);
    if (!path) return null;

    return { width, height, path };
}

/**
 * Soft accent “tertiary” pill that toggles the nested assistant rail.
 * Mounts with a one-shot accent shimmer that travels the real border perimeter
 * (SVG stroke-dashoffset — constant arc-length speed), then settles to the calm
 * accent outline. Answers: “Is this the smart AI entry?”
 */
export function AssistantTriggerButton({
    label,
    title,
    className,
}: {
    /** Accessible name + tooltip (e.g. “Toggle Assistant”). */
    label: string;
    /** Visible bilingual title (e.g. “Assistant”). */
    title: string;
    className?: string;
}) {
    const { toggleSidebar } = useSidebar();
    const reducedMotion = usePrefersReducedMotion();
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [geometry, setGeometry] = useState<OrbitGeometry | null>(null);
    const [orbitDone, setOrbitDone] = useState(false);

    useLayoutEffect(() => {
        if (reducedMotion || orbitDone) return;

        const element = buttonRef.current;
        if (!element) return;

        const sync = () => {
            setGeometry(measureOrbitGeometry(element));
        };
        sync();

        const observer = new ResizeObserver(sync);
        observer.observe(element);
        return () => observer.disconnect();
    }, [reducedMotion, orbitDone]);

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    ref={buttonRef}
                    type="button"
                    data-sidebar="trigger"
                    data-slot="sidebar-trigger"
                    variant="outline"
                    size="default"
                    className={cn(
                        'relative z-2 ml-auto rounded-t-2xl rounded-br-xs rounded-bl-2xl border-accent/35 bg-accent/10 px-4 py-2 text-[color-mix(in_oklab,var(--foreground)_72%,var(--accent))] shadow-xs hover:bg-accent/15 hover:text-[color-mix(in_oklab,var(--foreground)_60%,var(--accent))] active:bg-accent/20',
                        className,
                    )}
                    onClick={toggleSidebar}
                    aria-label={label}
                >
                    {!reducedMotion && !orbitDone && geometry ? (
                        <svg
                            aria-hidden
                            // `size-auto` opts out of Button’s `[&_svg:not([class*='size-'])]:size-4`
                            // so the orbit isn’t crushed to 16×16 in the top-left corner.
                            className="assistant-trigger-orbit pointer-events-none absolute -top-px -left-px z-1 size-auto max-h-none max-w-none overflow-visible"
                            width={geometry.width}
                            height={geometry.height}
                            viewBox={`0 0 ${geometry.width} ${geometry.height}`}
                            style={{ width: geometry.width, height: geometry.height }}
                            onAnimationEnd={(event) => {
                                if (event.target === event.currentTarget) setOrbitDone(true);
                            }}
                        >
                            <path
                                d={geometry.path}
                                pathLength={100}
                                fill="none"
                                stroke="var(--accent)"
                                strokeWidth={ORBIT_STROKE_WIDTH}
                                strokeLinecap="round"
                                strokeDasharray="10 90"
                                className="assistant-trigger-orbit-stroke"
                            />
                        </svg>
                    ) : null}
                    <BotMessageSquareIcon className="text-accent" />
                    <span>{title}</span>
                    <span className="sr-only">{label}</span>
                </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{label}</TooltipContent>
        </Tooltip>
    );
}
