import type { ExpansionMarket } from '../../shared/expansionMarkets';
import { cn } from '../utils/cn';
import { AppImage } from './AppImage';

const badgeSize = {
    sm: { rect: 'h-4', square: 'size-4' },
    md: { rect: 'h-5', square: 'size-5' },
    lg: { rect: 'h-7', square: 'size-7' },
} as const;

export function ExpansionMarketFlag({
    market,
    className,
    size = 'md',
    variant = 'badge',
    priority = false,
}: {
    market: ExpansionMarket;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'badge' | 'panel';
    priority?: boolean;
}) {
    if (variant === 'panel') {
        return (
            <div className={cn('px-6 pt-6', className)}>
                <AppImage
                    alt=""
                    aria-hidden
                    className="mx-auto h-auto w-full max-w-[455px]"
                    height={134}
                    priority={priority}
                    src={market.flagMarkSrc}
                    width={455}
                />
            </div>
        );
    }

    const square = market.countryCode === 'CH';
    const sizeClass = square ? badgeSize[size].square : badgeSize[size].rect;

    return (
        <span className={cn('inline-flex shrink-0 overflow-hidden rounded-sm border border-border/70', className)}>
            <AppImage
                alt=""
                aria-hidden
                className={cn(sizeClass, 'object-cover', !square && 'aspect-3/2')}
                priority={priority}
                src={market.flagSrc}
            />
        </span>
    );
}
