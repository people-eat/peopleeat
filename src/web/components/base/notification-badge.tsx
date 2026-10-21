import type { ComponentProps } from 'react';

import { cn } from '../../utils/cn';

export type NotificationBadgeProps = Omit<ComponentProps<'span'>, 'children'> & {
    count: number;
    /** Accessible name for the unread count (aria-label + title). */
    label?: string;
    /**
     * `corner` (default): absolute top-right on a `relative` parent (cards).
     * `inline`: flow layout for dense chrome (sidebar menu badges).
     */
    placement?: 'corner' | 'inline';
};

/**
 * Unread-count bubble (red disc + white bold numeral).
 * Returns null when `count` is zero or negative.
 * Cards use the full disc; sidebar (`inline`) uses a quieter compact size.
 */
function NotificationBadge({ count, label, placement = 'corner', className, ...props }: NotificationBadgeProps) {
    if (count <= 0) return null;

    return (
        <span
            data-slot="notification-badge"
            data-placement={placement}
            aria-label={label}
            title={label}
            className={cn(
                'flex shrink-0 items-center justify-center rounded-full bg-red-400 font-bold text-white tabular-nums',
                placement === 'corner' && 'absolute -top-2 -right-2 size-6 text-xs shadow-lg',
                placement === 'inline' && 'size-4 text-[10px]/none shadow-sm',
                className,
            )}
            {...props}
        >
            {count}
        </span>
    );
}

export { NotificationBadge };
