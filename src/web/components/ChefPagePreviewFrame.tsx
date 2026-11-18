import type { ReactNode } from 'react';

import { cn } from '../utils/cn';

/** Visual browser chrome around the guest chef-page WYSIWYG in the cook shell. */
export function ChefPagePreviewFrame({
    urlLabel,
    leading,
    actions,
    children,
    className,
}: {
    urlLabel: string;
    leading?: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-background', className)}>
            <div className="flex shrink-0 flex-col gap-2 border-b border-border bg-muted/50 px-3 py-2 sm:flex-row sm:items-center">
                <div className="flex min-w-0 items-center gap-2">
                    {leading}
                    <p className="min-w-0 truncate font-mono text-xs text-muted-foreground">{urlLabel}</p>
                </div>
                {actions != null ? <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-auto">{actions}</div> : null}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        </div>
    );
}
