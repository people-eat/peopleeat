import { useLocale } from '../../hooks/useLocale';
import { cn } from '../../utils/cn';
import { Button } from '../base/button';

export interface ChatArtifactCardData {
    imageUrl?: string | null;
    title: string;
    description?: string | null;
    price?: string | null;
    href?: string | null;
    buttonTitle?: string | null;
}

/**
 * Shared layout for CardList items and a selected GeoMap pin.
 *
 * - `row` — image left, text right (map pin detail; always compact).
 * - `responsive` — same as `row` in a narrow CardList container; image-on-top tile
 *   once the list can fit multiple columns (queries the CardList `@container` wrapper).
 */
export function ChatArtifactCard({
    card,
    className,
    layout = 'row',
}: {
    card: ChatArtifactCardData;
    className?: string;
    layout?: 'row' | 'responsive';
}) {
    const locale = useLocale();
    const hasLink = card.href != null && card.href.length > 0;
    const buttonLabel = card.buttonTitle != null && card.buttonTitle.length > 0 ? card.buttonTitle : null;
    const hasPrice = card.price != null && card.price.length > 0;
    const responsive = layout === 'responsive';

    return (
        <div
            className={cn(
                'flex min-w-0 overflow-hidden rounded-xl border border-border/60 bg-muted/40',
                responsive ? 'flex-row gap-3 @min-[28rem]:h-full @min-[28rem]:flex-col @min-[28rem]:gap-0' : 'flex-row gap-3',
                className,
            )}
        >
            {card.imageUrl ? (
                <img
                    src={card.imageUrl}
                    alt=""
                    className={cn(
                        // Row: fixed-width portrait strip, stretched to the card height. Do not use
                        // `aspect-*` + `w-auto` here — flex stretch collapses the computed width.
                        'w-20 shrink-0 self-stretch object-cover',
                        // Tile: full-width poster once the CardList container is multi-column.
                        responsive &&
                            '@min-[28rem]:aspect-2/3 @min-[28rem]:h-auto @min-[28rem]:max-h-56 @min-[28rem]:w-full @min-[28rem]:self-auto',
                    )}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                />
            ) : null}
            <div className={cn('flex min-w-0 min-h-0 flex-1 flex-col gap-1.5 px-3 py-2.5', responsive && '@min-[28rem]:p-3')}>
                <div className="flex min-w-0 items-start justify-between gap-2">
                    <div
                        className={cn(
                            'min-w-0 font-medium text-foreground',
                            responsive ? 'truncate @min-[28rem]:line-clamp-2 @min-[28rem]:whitespace-normal' : 'truncate',
                        )}
                    >
                        {card.title}
                    </div>
                    {hasPrice ? <div className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{card.price}</div> : null}
                </div>
                {card.description ? <p className="line-clamp-2 text-xs/relaxed text-muted-foreground">{card.description}</p> : null}
                {hasLink ? (
                    <div className="mt-auto pt-1">
                        <Button asChild size="sm" variant="secondary" className="w-full">
                            <a href={card.href!} target="_blank" rel="noopener noreferrer">
                                {buttonLabel ?? card.href}
                                <span className="sr-only">{{ de: ' (öffnet in neuem Tab)', en: ' (opens in new tab)' }[locale]}</span>
                            </a>
                        </Button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
