import { Link } from '@tanstack/react-router';
import { SoupIcon } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { useFeatureToggleActive } from '../hooks/useFeatureToggleActive';
import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import { AppImage } from './AppImage';
import { Badge } from './base/badge';
import { Button } from './base/button';
import { Popover, PopoverContent, PopoverTrigger } from './base/popover';
import { StatusBadge } from './base/status-badge';
import { MealDetailsDialog } from './MealDetailsDialog';

export type CookMealCardMeal = {
    title: string;
    description: string;
    imageUrl?: string | null;
    publishedAt?: string | null;
    deletedAt?: string | null;
};

export function CookMealCard({
    meal,
    meta,
    to,
    params,
    selected = false,
    action,
    dialogTitle,
    showStatusBadge = true,
    onAddImage,
    className,
    density = 'comfortable',
}: {
    meal: CookMealCardMeal;
    meta?: ReactNode;
    to?: '/{-$locale}/profile/meals/$mealId' | '/{-$locale}/admin/meals/$mealId';
    params?: { mealId: string };
    selected?: boolean;
    action?: ReactNode;
    dialogTitle?: string;
    showStatusBadge?: boolean;
    onAddImage?: () => void;
    className?: string;
    density?: 'comfortable' | 'compact';
}) {
    const locale = useLocale();
    const publicationEnabled = useFeatureToggleActive('PUBLICATION_MEALS');
    const [detailsOpen, setDetailsOpen] = useState(false);
    const shellRef = useRef<HTMLDivElement>(null);
    const [mediaSizePx, setMediaSizePx] = useState<number | null>(null);
    const isDeleted = meal.deletedAt != null;
    const resolvedImageUrl = meal.imageUrl != null && meal.imageUrl.length > 0 ? meal.imageUrl : null;
    const priorPublishLabel = meal.publishedAt
        ? { de: 'War veröffentlicht', en: 'Was published' }[locale]
        : { de: 'War Entwurf', en: 'Was a draft' }[locale];
    const description = meal.description.trim().length > 0 ? meal.description : { de: 'Keine Beschreibung', en: 'No description' }[locale];
    const renderDraftPublishedBadge = showStatusBadge && publicationEnabled && !isDeleted;
    const renderDeletedBadge = showStatusBadge && isDeleted;
    const missingImage = resolvedImageUrl == null;
    const publishedWithoutImage = missingImage && meal.publishedAt != null && !isDeleted;
    const compact = density === 'compact';
    const mediaMinPx = compact ? 56 : 96;

    useLayoutEffect(() => {
        const shell = shellRef.current;
        if (shell == null || typeof ResizeObserver === 'undefined') return;

        const syncMediaSize = () => {
            const styles = getComputedStyle(shell);
            const paddingY = (Number.parseFloat(styles.paddingTop) || 0) + (Number.parseFloat(styles.paddingBottom) || 0);
            const paddingX = (Number.parseFloat(styles.paddingLeft) || 0) + (Number.parseFloat(styles.paddingRight) || 0);
            // Match media to content height, but never steal the text column in narrow
            // grids (chat rail / multi-col). Without a width cap, `size-full` +
            // stretched rows + ResizeObserver can grow into tall skinny tiles.
            const heightBased = Math.max(Math.round(shell.clientHeight - paddingY), mediaMinPx);
            const textFloorPx = compact ? 120 : 160;
            const widthCap = Math.max(mediaMinPx, Math.round(shell.clientWidth - paddingX - textFloorPx));
            const next = Math.min(heightBased, widthCap);
            setMediaSizePx((current) => (current === next ? current : next));
        };

        syncMediaSize();
        const observer = new ResizeObserver(syncMediaSize);
        observer.observe(shell);
        return () => observer.disconnect();
    }, [compact, mediaMinPx]);

    const media = (
        <div
            className={cn(
                'relative shrink-0 overflow-hidden rounded-lg',
                compact ? 'size-14' : 'size-24',
                resolvedImageUrl == null && 'border border-border bg-secondary text-muted-foreground',
            )}
            style={mediaSizePx != null ? { width: mediaSizePx, height: mediaSizePx } : undefined}
            aria-hidden={resolvedImageUrl == null ? true : undefined}
        >
            {resolvedImageUrl != null ? (
                <AppImage src={resolvedImageUrl} alt="" className="size-full object-cover" />
            ) : (
                <div className="flex size-full items-center justify-center">
                    <SoupIcon className={compact ? 'size-5' : 'size-6'} />
                </div>
            )}
        </div>
    );

    const footer = (
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1">
            {renderDeletedBadge ? <Badge variant="destructive">{{ de: 'Gelöscht', en: 'Deleted' }[locale]}</Badge> : null}
            {renderDraftPublishedBadge ? (
                <Badge variant="outline">
                    {meal.publishedAt ? { de: 'Veröffentlicht', en: 'Published' }[locale] : { de: 'Entwurf', en: 'Draft' }[locale]}
                </Badge>
            ) : null}
            {publishedWithoutImage ? (
                <StatusBadge tone="warning">{{ de: 'Nicht auf Profil', en: 'Not on public page' }[locale]}</StatusBadge>
            ) : null}
            {missingImage && !publishedWithoutImage ? (
                <div
                    className="inline-flex"
                    onClick={(event) => event.stopPropagation()}
                    onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                    }}
                >
                    <Popover>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                className="inline-flex cursor-pointer"
                                aria-label={
                                    {
                                        de: 'Hinweis: Gericht ohne Bild',
                                        en: 'Note: meal without picture',
                                    }[locale]
                                }
                            >
                                <StatusBadge
                                    tone="warning"
                                    label={
                                        {
                                            de: 'Hinweis: Gericht ohne Bild',
                                            en: 'Note: meal without picture',
                                        }[locale]
                                    }
                                />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-64 p-3 text-sm">
                            <div className="grid gap-2">
                                <p>
                                    {
                                        {
                                            de: 'Ohne Bild erscheint dieses Gericht nicht auf deiner öffentlichen Kochseite, sobald es veröffentlicht ist.',
                                            en: 'Without a picture, this meal will not appear on your public cook page once published.',
                                        }[locale]
                                    }
                                </p>
                                {onAddImage != null ? (
                                    <Button type="button" size="sm" variant="outline" className="justify-self-start" onClick={onAddImage}>
                                        {{ de: 'Bild hinzufügen', en: 'Add picture' }[locale]}
                                    </Button>
                                ) : null}
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            ) : null}
            {isDeleted || meta != null ? (
                <span className="text-sm text-muted-foreground">
                    {isDeleted ? (
                        <>
                            {priorPublishLabel}
                            {meta != null ? (
                                <>
                                    {' · '}
                                    {meta}
                                </>
                            ) : null}
                        </>
                    ) : (
                        meta
                    )}
                </span>
            ) : null}
        </div>
    );

    const text = (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1">
            <p
                className={cn(
                    'font-semibold',
                    compact ? 'line-clamp-1 text-sm/snug' : 'line-clamp-2 min-h-10 text-sm/snug sm:min-h-11 sm:text-base',
                )}
            >
                {meal.title}
            </p>
            <p className={cn('text-sm text-muted-foreground', compact ? 'line-clamp-1' : 'line-clamp-2 min-h-10')}>{description}</p>
            {footer}
        </div>
    );

    const shellClassName = cn(
        'flex size-full items-stretch gap-3 overflow-clip rounded-xl border border-border text-left transition',
        compact ? 'p-2' : 'p-3',
        selected ? 'bg-muted' : 'bg-card',
        className,
    );

    const mainClassName = cn(
        'flex min-h-0 min-w-0 flex-1 items-stretch gap-3 text-left outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
    );

    const actionSlot =
        action != null ? (
            <div
                className="flex shrink-0 items-center self-center pr-1"
                onClick={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
            >
                {action}
            </div>
        ) : null;

    if (to != null && params != null) {
        return (
            <div ref={shellRef} className={shellClassName}>
                <Link to={to} params={params} className={cn(mainClassName, 'cursor-pointer')}>
                    {media}
                    {text}
                </Link>
                {actionSlot}
            </div>
        );
    }

    return (
        <>
            <div ref={shellRef} className={shellClassName}>
                <button type="button" className={cn(mainClassName, 'cursor-pointer rounded-lg')} onClick={() => setDetailsOpen(true)}>
                    {media}
                    {text}
                </button>
                {actionSlot}
            </div>
            <MealDetailsDialog
                open={detailsOpen}
                onOpenChange={setDetailsOpen}
                title={meal.title}
                description={meal.description}
                imageUrl={meal.imageUrl}
                dialogTitle={dialogTitle}
            />
        </>
    );
}
