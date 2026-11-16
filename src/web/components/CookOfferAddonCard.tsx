import { Link } from '@tanstack/react-router';
import { GiftIcon } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { useT } from '../hooks/useT';
import { cn } from '../utils/cn';
import { AppImage } from './AppImage';

export type CookOfferAddonCardAddon = {
    title: string;
    description: string;
    imageUrl?: string | null;
};

export function CookOfferAddonCard({
    addon,
    meta,
    to,
    params,
    className,
    density = 'comfortable',
}: {
    addon: CookOfferAddonCardAddon;
    meta?: ReactNode;
    to: '/{-$locale}/profile/offer-addons/$cookOfferAddonId/edit';
    params: { cookOfferAddonId: string };
    className?: string;
    density?: 'comfortable' | 'compact';
}) {
    const { t } = useT('profileCook');
    const shellRef = useRef<HTMLDivElement>(null);
    const [mediaSizePx, setMediaSizePx] = useState<number | null>(null);
    const resolvedImageUrl = addon.imageUrl != null && addon.imageUrl.length > 0 ? addon.imageUrl : null;
    const description = addon.description.trim().length > 0 ? addon.description : t('actions.noDescription');
    const compact = density === 'compact';
    const mediaMinPx = compact ? 56 : 96;

    useLayoutEffect(() => {
        const shell = shellRef.current;
        if (shell == null || typeof ResizeObserver === 'undefined') return;

        const syncMediaSize = () => {
            const styles = getComputedStyle(shell);
            const paddingY = (Number.parseFloat(styles.paddingTop) || 0) + (Number.parseFloat(styles.paddingBottom) || 0);
            const paddingX = (Number.parseFloat(styles.paddingLeft) || 0) + (Number.parseFloat(styles.paddingRight) || 0);
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
                    <GiftIcon className={compact ? 'size-5' : 'size-6'} />
                </div>
            )}
        </div>
    );

    return (
        <div
            ref={shellRef}
            className={cn(
                'flex size-full items-stretch gap-3 overflow-clip rounded-xl border border-border bg-card text-left transition',
                compact ? 'p-2' : 'p-3',
                className,
            )}
        >
            <Link
                to={to}
                params={params}
                className={cn(
                    'flex min-h-0 min-w-0 flex-1 cursor-pointer items-stretch gap-3 text-left outline-none',
                    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                )}
            >
                {media}
                <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1">
                    <p
                        className={cn(
                            'font-semibold',
                            compact ? 'line-clamp-1 text-sm/snug' : 'line-clamp-2 min-h-10 text-sm/snug sm:min-h-11 sm:text-base',
                        )}
                    >
                        {addon.title}
                    </p>
                    <p className={cn('text-sm text-muted-foreground', compact ? 'line-clamp-1' : 'line-clamp-2 min-h-10')}>{description}</p>
                    {meta != null ? (
                        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1">
                            <span className="text-sm text-muted-foreground">{meta}</span>
                        </div>
                    ) : null}
                </div>
            </Link>
        </div>
    );
}
