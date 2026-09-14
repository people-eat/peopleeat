import type { ComponentProps, ReactNode } from 'react';

import { cn } from '../../utils/cn';
import { Alert, AlertDescription, AlertTitle } from './alert';
import type { StatusTone } from './status';
import { StatusIcon } from './status-icon';

export type StatusAlertProps = Omit<ComponentProps<'div'>, 'title' | 'children'> & {
    tone: StatusTone;
    title?: ReactNode;
    children?: ReactNode;
    /** Optional trailing actions (buttons). Stacked under copy on mobile; right-aligned from `sm`. */
    action?: ReactNode;
};

/**
 * Page / section status banner — soft tinted surface + circular status icon.
 * Prefer this over ad-hoc bordered cards for incomplete, pending, or error states.
 *
 * Alignment: top when title + body are both present; center for a single title-
 * or body-only line so the chip sits flush with short copy. Action is a sibling
 * of the copy column: stacked below on mobile, trailing on the right from `sm`.
 */
function StatusAlert({ tone, title, children, action, className, ...props }: StatusAlertProps) {
    const isStacked = title != null && children != null;

    return (
        <Alert
            data-slot="status-alert"
            data-tone={tone}
            variant={tone}
            role={tone === 'error' ? 'alert' : 'status'}
            className={cn(!isStacked && 'items-center', className)}
            {...props}
        >
            <StatusIcon tone={tone} />
            <div data-slot="status-alert-body" className="col-start-2 flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                <div data-slot="status-alert-copy" className="flex min-w-0 flex-1 flex-col gap-0.5">
                    {title != null ? <AlertTitle className="col-auto line-clamp-none min-h-0 leading-snug">{title}</AlertTitle> : null}
                    {children != null ? (
                        <AlertDescription className="col-auto leading-snug [&_p]:leading-snug">{children}</AlertDescription>
                    ) : null}
                </div>
                {action != null ? (
                    <div data-slot="status-alert-action" className="mt-1.5 flex shrink-0 flex-wrap gap-2 text-foreground sm:mt-0">
                        {action}
                    </div>
                ) : null}
            </div>
        </Alert>
    );
}

export { StatusAlert };
