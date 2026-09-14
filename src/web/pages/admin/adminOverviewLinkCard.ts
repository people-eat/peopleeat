import { cn } from '../../utils/cn';

/** Elevated surface for admin cards (interactive or static). */
export function adminOverviewCardClassName(className?: string) {
    return cn('rounded-xl border border-border/60 bg-card text-card-foreground shadow-sm', className);
}

/** Interactive chrome for admin overview nav, distribution, and list link cards. */
export function adminOverviewLinkCardClassName(className?: string) {
    return cn(
        adminOverviewCardClassName(),
        'group transition-colors hover:bg-muted/40 active:bg-foreground/10',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        className,
    );
}

export const adminOverviewLinkCardChevronClassName =
    'size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0';
