import { StarIcon, UserIcon } from 'lucide-react';
import { useState } from 'react';

import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import { Button } from './base/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './base/dialog';

export type PageTestimonialCardModel = {
    authorName: string;
    location: string | null;
    occasion: string | null;
    body: string;
    rating: number | null;
    imageUrls?: ReadonlyArray<string>;
};

function TestimonialRating({ rating, className }: { rating: number; className?: string }) {
    const locale = useLocale();
    const average = rating.toFixed(1);
    const label = { de: `${average.replace('.', ',')} von 5 Sternen`, en: `${average} out of 5 stars` }[locale];

    return (
        <div className={cn('flex items-center gap-1.5', className)}>
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

/** Curated public testimonial tile — clamped quote + detail dialog. Used by `SectionPageTestimonials`. */
export function PageTestimonialCard({ testimonial, className }: { testimonial: PageTestimonialCardModel; className?: string }) {
    const locale = useLocale();
    const [open, setOpen] = useState(false);
    const imageUrls = testimonial.imageUrls ?? [];
    const viewLabel = { de: 'Bewertung ansehen', en: 'View review' }[locale];

    return (
        <figure className={cn('flex h-full flex-col gap-4', className)}>
            <div className="flex items-start justify-between gap-3">
                {testimonial.rating != null ? <TestimonialRating rating={testimonial.rating} /> : <span />}
                {testimonial.occasion ? (
                    <p className="max-w-[50%] truncate text-right text-sm text-muted-foreground">{testimonial.occasion}</p>
                ) : null}
            </div>

            <blockquote className="flex-1 text-base/relaxed text-foreground">
                <p className="line-clamp-4">{testimonial.body}</p>
            </blockquote>

            <div className="mt-auto flex items-end justify-between gap-3">
                <figcaption className="flex min-w-0 items-center gap-3">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground">
                        <UserIcon aria-hidden className="size-5" />
                    </span>
                    <div className="min-w-0 text-sm">
                        <div className="truncate font-medium text-foreground">{testimonial.authorName}</div>
                        {testimonial.location ? <div className="truncate text-muted-foreground">{testimonial.location}</div> : null}
                    </div>
                </figcaption>

                <Button type="button" variant="link" size="sm" className="h-auto shrink-0 px-0" onClick={() => setOpen(true)}>
                    {viewLabel}
                </Button>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader className="gap-3 text-left">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            {testimonial.rating != null ? <TestimonialRating rating={testimonial.rating} /> : null}
                            {testimonial.occasion ? <p className="text-sm text-muted-foreground">{testimonial.occasion}</p> : null}
                        </div>
                        <DialogTitle>{testimonial.authorName}</DialogTitle>
                        <DialogDescription>
                            {testimonial.location ?? { de: 'Kundenbewertung', en: 'Customer review' }[locale]}
                        </DialogDescription>
                    </DialogHeader>

                    <blockquote className="text-base/relaxed text-foreground">
                        <p className="whitespace-pre-wrap">{testimonial.body}</p>
                    </blockquote>

                    {imageUrls.length > 0 ? (
                        <ul className="grid grid-cols-2 gap-2">
                            {imageUrls.map((url) => (
                                <li key={url} className="overflow-hidden rounded-md bg-muted">
                                    <img src={url} alt="" className="aspect-square w-full object-cover" />
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </DialogContent>
            </Dialog>
        </figure>
    );
}
