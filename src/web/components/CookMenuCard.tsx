import { Link } from '@tanstack/react-router';
import { BookOpenIcon } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import { useFeatureToggleActive } from '../hooks/useFeatureToggleActive';
import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import { Badge } from './base/badge';
import { MenuDetailsDialog } from './MenuDetailsDialog';

export type CookMenuCardMenu = {
    title: string;
    description: string;
    courseCount: number;
    courseMealOptionImages?: ReadonlyArray<string>;
    publishedAt?: string | null;
    deletedAt?: string | null;
};

export function CookMenuCardMedia({
    images,
    density = 'comfortable',
    className,
    style,
}: {
    images: ReadonlyArray<string>;
    density?: 'comfortable' | 'compact';
    className?: string;
    style?: CSSProperties;
}) {
    const tiles = images.slice(0, 4);
    // Fixed square fallback; CookMenuCard may override via measured `style` so the collage
    // matches card height without a CSS aspect-ratio flex feedback loop.
    const boxClass = cn('shrink-0', density === 'compact' ? 'size-14' : 'size-24', className);

    if (tiles.length === 0) {
        return (
            <div
                className={cn(
                    'flex items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground',
                    boxClass,
                )}
                style={style}
                aria-hidden
            >
                <BookOpenIcon className={cn('opacity-50', density === 'compact' ? 'size-5' : 'size-6')} />
            </div>
        );
    }

    if (tiles.length === 1) {
        return (
            <div className={cn('overflow-hidden rounded-lg', boxClass)} style={style} aria-hidden>
                <img src={tiles[0]} alt="" className="size-full object-cover" />
            </div>
        );
    }

    if (tiles.length === 2) {
        return (
            <div className={cn('grid grid-cols-2 gap-0.5 overflow-hidden rounded-lg', boxClass)} style={style} aria-hidden>
                {tiles.map((url) => (
                    <img key={url} src={url} alt="" className="size-full min-h-0 object-cover" />
                ))}
            </div>
        );
    }

    if (tiles.length === 3) {
        return (
            <div className={cn('grid grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-lg', boxClass)} style={style} aria-hidden>
                <img src={tiles[0]} alt="" className="row-span-2 size-full min-h-0 object-cover" />
                <img src={tiles[1]} alt="" className="size-full min-h-0 object-cover" />
                <img src={tiles[2]} alt="" className="size-full min-h-0 object-cover" />
            </div>
        );
    }

    return (
        <div className={cn('grid grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-lg', boxClass)} style={style} aria-hidden>
            {tiles.map((url) => (
                <img key={url} src={url} alt="" className="size-full min-h-0 object-cover" />
            ))}
        </div>
    );
}

export function CookMenuCard({
    menu,
    meta,
    to,
    params,
    showStatusBadge = true,
    density = 'comfortable',
    dialogTitle,
}: {
    menu: CookMenuCardMenu;
    meta?: ReactNode;
    to?: '/{-$locale}/profile/menus/$menuId' | '/{-$locale}/admin/menus/$menuId';
    params?: { menuId: string };
    showStatusBadge?: boolean;
    density?: 'comfortable' | 'compact';
    dialogTitle?: string;
}) {
    const locale = useLocale();
    const publicationEnabled = useFeatureToggleActive('PUBLICATION_MENUS');
    const [detailsOpen, setDetailsOpen] = useState(false);
    const shellRef = useRef<HTMLDivElement>(null);
    const [mediaSizePx, setMediaSizePx] = useState<number | null>(null);
    const isDeleted = menu.deletedAt != null;
    const priorPublishLabel = menu.publishedAt
        ? { de: 'War veröffentlicht', en: 'Was published' }[locale]
        : { de: 'War Entwurf', en: 'Was a draft' }[locale];
    const courseLabel =
        menu.courseCount === 1
            ? { de: '1 Gang', en: '1 course' }[locale]
            : { de: `${menu.courseCount} Gänge`, en: `${menu.courseCount} courses` }[locale];
    const renderDraftPublishedBadge = showStatusBadge && publicationEnabled && !isDeleted;
    const renderDeletedBadge = showStatusBadge && isDeleted;
    const images = menu.courseMealOptionImages ?? [];
    const description = menu.description.trim().length > 0 ? menu.description : { de: 'Keine Beschreibung', en: 'No description' }[locale];
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

    const mediaStyle = mediaSizePx != null ? { width: mediaSizePx, height: mediaSizePx } : undefined;

    const content = (
        <>
            <CookMenuCardMedia images={images} density={density} style={mediaStyle} />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1">
                <h2
                    className={cn(
                        'font-semibold',
                        compact ? 'line-clamp-1 text-sm/snug' : 'line-clamp-2 min-h-10 text-sm/snug sm:min-h-11 sm:text-base',
                    )}
                >
                    {menu.title}
                </h2>
                <p className={cn('text-sm text-muted-foreground', compact ? 'line-clamp-1' : 'line-clamp-2 min-h-10')}>{description}</p>
                <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1">
                    {renderDeletedBadge ? <Badge variant="destructive">{{ de: 'Gelöscht', en: 'Deleted' }[locale]}</Badge> : null}
                    {renderDraftPublishedBadge ? (
                        <Badge variant="outline">
                            {menu.publishedAt ? { de: 'Veröffentlicht', en: 'Published' }[locale] : { de: 'Entwurf', en: 'Draft' }[locale]}
                        </Badge>
                    ) : null}
                    <span className="text-sm text-muted-foreground">{courseLabel}</span>
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
            </div>
        </>
    );

    const shellClassName = cn(
        'flex size-full items-stretch overflow-clip rounded-xl border border-border bg-card text-left text-card-foreground transition',
        'hover:bg-muted/40',
        compact ? 'p-2' : 'p-3',
    );

    const mainClassName = cn(
        'flex min-h-0 min-w-0 flex-1 items-stretch gap-3 text-left outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
    );

    if (to != null && params != null) {
        return (
            <div ref={shellRef} className={shellClassName}>
                <Link to={to} params={params} className={cn(mainClassName, 'cursor-pointer')}>
                    {content}
                </Link>
            </div>
        );
    }

    return (
        <>
            <div ref={shellRef} className={shellClassName}>
                <button type="button" className={cn(mainClassName, 'cursor-pointer rounded-lg')} onClick={() => setDetailsOpen(true)}>
                    {content}
                </button>
            </div>
            <MenuDetailsDialog
                open={detailsOpen}
                onOpenChange={setDetailsOpen}
                title={menu.title}
                description={menu.description}
                courseCount={menu.courseCount}
                images={images}
                publishedAt={menu.publishedAt}
                deletedAt={menu.deletedAt}
                meta={meta}
                dialogTitle={dialogTitle}
            />
        </>
    );
}
