import type { PropsWithChildren } from 'react';
import { useInView } from '../hooks/useInView';
import { cn } from '../utils/cn';

interface Props extends PropsWithChildren {
    /** Stagger index inside a sibling group. Each step delays by 70ms, capped at 3. */
    index?: number;
    /** Override the default block-level wrapper (e.g. for `<li>`). */
    as?: 'div' | 'section' | 'li';
    className?: string;
    /** Full-bleed dark media — sticky public header inverts the wordmark while this region is under the chrome. */
    overMedia?: boolean;
}

const STAGGER_STEP_MS = 70;
const STAGGER_MAX_STEPS = 3;

export function Reveal({ children, index = 0, as: Tag = 'div', className, overMedia = false }: Props) {
    const { ref, inView } = useInView<HTMLDivElement>();
    const step = Math.min(Math.max(index, 0), STAGGER_MAX_STEPS);
    const delayMs = step * STAGGER_STEP_MS;

    return (
        <Tag
            ref={ref as never}
            data-state={inView ? 'in' : 'out'}
            style={{ transitionDelay: `${delayMs}ms` }}
            className={cn(
                'transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none',
                'data-[state=out]:opacity-0 data-[state=out]:translate-y-2 motion-reduce:data-[state=out]:translate-y-0',
                'data-[state=in]:opacity-100 data-[state=in]:translate-y-0',
                className,
            )}
            {...(overMedia ? { 'data-over-media': '' } : {})}
        >
            {children}
        </Tag>
    );
}
