import { SoupIcon } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';

import { cn } from '../utils/cn';
import { AppImage } from './AppImage';
import { bookingRequestCardInteractionClassName } from './bookingRequestCardInteraction';
import { MealDetailsDialog } from './MealDetailsDialog';

export function CustomerMealCard({
    title,
    description,
    imageUrl,
    selected = false,
    action,
    dialogTitle,
    disabled = false,
    variant = 'default',
    className,
}: {
    title: string;
    description: string;
    imageUrl?: string | null;
    selected?: boolean;
    action?: ReactNode;
    dialogTitle?: string;
    disabled?: boolean;
    /** `marketing` — square image on top with title + clamped description (public cook page). */
    variant?: 'default' | 'marketing';
    className?: string;
}) {
    const [detailsOpen, setDetailsOpen] = useState(false);
    const resolvedImageUrl = imageUrl != null && imageUrl.length > 0 ? imageUrl : null;

    const detailsDialog = (
        <MealDetailsDialog
            open={detailsOpen}
            onOpenChange={setDetailsOpen}
            title={title}
            description={description}
            imageUrl={imageUrl}
            dialogTitle={dialogTitle}
        />
    );

    if (variant === 'marketing') {
        return (
            <>
                <button
                    type="button"
                    disabled={disabled}
                    className={cn(
                        'flex size-full flex-col overflow-hidden rounded-xl border border-border bg-card text-left text-card-foreground shadow-sm',
                        bookingRequestCardInteractionClassName,
                        selected && 'ring-1 ring-foreground/40',
                        disabled && !selected && 'opacity-50',
                        className,
                    )}
                    onClick={() => setDetailsOpen(true)}
                >
                    {resolvedImageUrl != null ? (
                        <div className="aspect-square w-full overflow-hidden bg-muted">
                            <AppImage src={resolvedImageUrl} alt="" className="size-full object-cover" />
                        </div>
                    ) : (
                        <div
                            className="flex aspect-square w-full items-center justify-center bg-secondary text-muted-foreground"
                            aria-hidden
                        >
                            <SoupIcon className="size-8" />
                        </div>
                    )}
                    <div className="flex flex-1 flex-col gap-1 p-3">
                        <p className="text-sm/snug font-semibold">{title}</p>
                        {description.trim().length > 0 ? <p className="text-sm text-muted-foreground line-clamp-2">{description}</p> : null}
                    </div>
                </button>

                {detailsDialog}
            </>
        );
    }

    return (
        <>
            <div
                className={cn(
                    'flex items-stretch gap-3 rounded-xl border border-border bg-card p-2 transition sm:p-3',
                    selected && 'ring-1 ring-foreground/40',
                    disabled && !selected && 'opacity-50',
                    className,
                )}
            >
                <button
                    type="button"
                    className={cn(
                        'flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left outline-none',
                        'cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                    )}
                    onClick={() => setDetailsOpen(true)}
                >
                    {resolvedImageUrl != null ? (
                        <div className="size-20 shrink-0 overflow-hidden rounded-lg sm:size-24">
                            <AppImage src={resolvedImageUrl} alt="" className="size-full object-cover" />
                        </div>
                    ) : (
                        <div
                            className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground sm:size-24"
                            aria-hidden
                        >
                            <SoupIcon className="size-6" />
                        </div>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col gap-1 py-1">
                        <p className="text-sm/snug font-semibold sm:text-base line-clamp-2">{title}</p>
                        {description.trim().length > 0 ? (
                            <p className="text-sm text-muted-foreground line-clamp-1 sm:line-clamp-2">{description}</p>
                        ) : null}
                    </div>
                </button>

                {action != null ? <div className="flex shrink-0 items-center self-center pr-1">{action}</div> : null}
            </div>

            {detailsDialog}
        </>
    );
}
