import type { ComponentProps, ReactNode } from 'react';

import { cn } from '../../utils/cn';
import { statusBadgeToneClass } from './status';
import type { StatusTone } from './status';
import { StatusIcon } from './status-icon';

export type StatusBadgeProps = Omit<ComponentProps<'span'>, 'children'> & {
    tone: StatusTone;
    /** Accessible name — required when there is no visible label. */
    label?: string;
    children?: ReactNode;
};

/**
 * Compact status affordance for nav items, list rows, and card headers.
 * Icon-only when `children` is omitted (pass `label` for accessibility).
 */
function StatusBadge({ tone, label, children, className, ...props }: StatusBadgeProps) {
    const iconOnly = children == null || children === false;

    if (iconOnly) {
        return (
            <span
                data-slot="status-badge"
                data-tone={tone}
                role="img"
                aria-label={label}
                title={label}
                className={cn('inline-flex shrink-0', className)}
                {...props}
            >
                <StatusIcon tone={tone} size="sm" />
            </span>
        );
    }

    return (
        <span
            data-slot="status-badge"
            data-tone={tone}
            className={cn(
                'inline-flex w-fit max-w-full shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap tabular-nums',
                statusBadgeToneClass[tone],
                className,
            )}
            {...props}
        >
            <StatusIcon tone={tone} size="sm" className="size-4 [&_svg]:size-2.5" />
            <span className="min-w-0 truncate">{children}</span>
        </span>
    );
}

export { StatusBadge };
