import type { ComponentProps, ReactNode } from 'react';

import type { BookingLifecycleHue } from '../../shared/bookingLifecycleHue';
import { cn } from '../utils/cn';

const bookingStatusPillHueClassName = {
    yellow: 'bg-yellow-100 text-yellow-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    purple: 'bg-purple-100 text-purple-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-700',
} as const satisfies Record<BookingLifecycleHue, string>;

export type BookingStatusPillProps = Omit<ComponentProps<'span'>, 'children'> & {
    hue: BookingLifecycleHue;
    children: ReactNode;
};

/**
 * Colored lifecycle pill for booking request / offer statuses.
 * Pick the hue via `bookingRequestStatusHue` / `bookingRequestOfferStatusHue` from `src/shared`.
 */
export function BookingStatusPill({ hue, children, className, ...props }: BookingStatusPillProps) {
    return (
        <span
            data-slot="booking-status-pill"
            data-hue={hue}
            className={cn(
                'inline-flex w-fit max-w-full shrink-0 items-center justify-center overflow-hidden rounded-xl px-4 py-2 text-xs font-medium whitespace-nowrap',
                bookingStatusPillHueClassName[hue],
                className,
            )}
            {...props}
        >
            {children}
        </span>
    );
}
