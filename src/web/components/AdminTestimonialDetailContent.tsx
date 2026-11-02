import { StarIcon } from 'lucide-react';

import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import { AppImage } from './AppImage';

function AdminTestimonialRating({ rating }: { rating: number }) {
    const locale = useLocale();
    const average = rating.toFixed(1);
    const label = { de: `${average.replace('.', ',')} von 5 Sternen`, en: `${average} out of 5 stars` }[locale];

    return (
        <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5" role="img" aria-label={label}>
                {Array.from({ length: 5 }, (_, index) => (
                    <StarIcon
                        key={index}
                        aria-hidden
                        className={cn('size-4', index < rating ? 'fill-accent text-accent' : 'text-muted-foreground/30')}
                    />
                ))}
            </div>
            <span className="text-sm tabular-nums text-muted-foreground">{average}</span>
        </div>
    );
}

/** Read-only testimonial body styled like the public card face, without clamp or dialog. */
export function AdminTestimonialDetailContent({
    occasion,
    body,
    rating,
    imageUrls,
}: {
    occasion: string | null;
    body: string;
    rating: number | null;
    imageUrls: ReadonlyArray<string>;
}) {
    const locale = useLocale();
    const emptyBody = { de: 'Noch kein Text.', en: 'No body yet.' }[locale];
    const trimmedBody = body.trim();

    return (
        <section className="grid gap-4">
            <div className="flex items-start justify-between gap-3">
                {occasion?.trim() ? (
                    <h2 className="min-w-0 flex-1 text-base font-medium text-foreground">{occasion.trim()}</h2>
                ) : (
                    <h2 className="min-w-0 flex-1 text-base font-medium text-muted-foreground">
                        {{ de: 'Ohne Anlass', en: 'No occasion' }[locale]}
                    </h2>
                )}
                {rating != null ? <AdminTestimonialRating rating={rating} /> : null}
            </div>

            <blockquote className="border-l-2 border-accent/40 pl-4 text-base/relaxed text-foreground">
                <p className={cn('whitespace-pre-wrap', !trimmedBody && 'text-muted-foreground')}>{trimmedBody || emptyBody}</p>
            </blockquote>

            {imageUrls.length > 0 ? (
                <ul className="grid grid-cols-4 gap-1.5" aria-label={{ de: 'Fotos der Bewertung', en: 'Review photos' }[locale]}>
                    {imageUrls.map((url) => (
                        <li key={url}>
                            <div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted">
                                <AppImage src={url} alt="" className="size-full object-cover" />
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-muted-foreground">{{ de: 'Noch keine Bilder.', en: 'No images yet.' }[locale]}</p>
            )}
        </section>
    );
}
