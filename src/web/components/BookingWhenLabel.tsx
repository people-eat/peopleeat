import type { ReactNode } from 'react';

import { cn } from '../utils/cn';

/** Primary event/call time plus an optional muted mismatch line. */
export function BookingWhenLabel({ primary, secondary, className }: { primary: ReactNode; secondary?: string | null; className?: string }) {
    return (
        <span className={cn('grid min-w-0 gap-0.5', className)}>
            <span>{primary}</span>
            {secondary != null && secondary.length > 0 ? (
                <span className="whitespace-pre-line text-sm font-normal text-muted-foreground">{secondary}</span>
            ) : null}
        </span>
    );
}
