import type { ComponentProps, ReactNode } from 'react';

import { cn } from '../utils/cn';

export type BookingStatusPillProps = Omit<ComponentProps<'span'>, 'children'> & {
    children: ReactNode;
};

/**
 * Colored lifecycle pill for booking request / offer statuses.
 * Uses the predecessor yellow/blue/green/purple/red palette — see
 * `bookingRequestStatusClassName` / `bookingRequestOfferStatusClassName`.
 */
export function BookingStatusPill({ children, className, ...props }: BookingStatusPillProps) {
    return (
        <span
            data-slot="booking-status-pill"
            className={cn(
                'inline-flex w-fit max-w-full shrink-0 items-center justify-center overflow-hidden rounded-xl px-4 py-2 text-xs font-medium whitespace-nowrap',
                className,
            )}
            {...props}
        >
            {children}
        </span>
    );
}
