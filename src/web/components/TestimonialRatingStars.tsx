import { StarIcon } from 'lucide-react';

import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';

/** Read-only 1–5 star rating display — list rows, detail pages. */
export function TestimonialRatingStars({ rating, className }: { rating: number | null | undefined; className?: string }) {
    const locale = useLocale();

    if (rating == null) {
        return <span className={cn('text-sm text-muted-foreground', className)}>{{ de: 'Keine Bewertung', en: 'No rating' }[locale]}</span>;
    }

    return (
        <span className={cn('inline-flex items-center gap-0.5', className)} role="img" aria-label={`${rating}/5`}>
            {[1, 2, 3, 4, 5].map((position) => (
                <StarIcon
                    key={position}
                    aria-hidden
                    className={cn('size-3.5', position <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30')}
                />
            ))}
        </span>
    );
}
