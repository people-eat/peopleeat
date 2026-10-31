import { ChevronLeftIcon, ChevronRightIcon, StarIcon } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import { AppImage } from './AppImage';
import { Avatar, AvatarFallback, AvatarImage } from './base/avatar';
import { Button } from './base/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './base/dialog';

export type PageTestimonialCardModel = {
    authorName: string;
    authorProfilePictureUrl?: string | null;
    location: string | null;
    occasion: string | null;
    body: string;
    rating: number | null;
    imageUrls?: ReadonlyArray<string>;
};

const CARD_IMAGE_SLOTS = 4;

function initialsFromName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

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

function TestimonialAuthor({
    authorName,
    authorProfilePictureUrl,
    location,
    size = 'md',
}: {
    authorName: string;
    authorProfilePictureUrl?: string | null;
    location: string | null;
    size?: 'md' | 'lg';
}) {
    return (
        <div className={cn('flex min-w-0 items-center gap-3', size === 'lg' && 'gap-4')}>
            <Avatar className={cn('shrink-0', size === 'lg' ? 'size-12' : 'size-10')}>
                {authorProfilePictureUrl ? <AvatarImage src={authorProfilePictureUrl} alt="" /> : null}
                <AvatarFallback className={size === 'lg' ? 'text-sm' : 'text-xs'}>{initialsFromName(authorName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 text-sm">
                <div className={cn('truncate font-medium text-foreground', size === 'lg' && 'text-base')}>{authorName}</div>
                {location ? <div className="truncate text-muted-foreground">{location}</div> : null}
            </div>
        </div>
    );
}

/** Up to four square thumbs; when there are more than four, slot 4 is “+N more”. */
function TestimonialImageStrip({
    imageUrls,
    onOpen,
}: {
    imageUrls: ReadonlyArray<string>;
    /** When omitted, thumbs are non-interactive (safe inside a surrounding Link). */
    onOpen?: (index: number) => void;
}) {
    const locale = useLocale();
    if (imageUrls.length === 0) return null;

    const overflow = imageUrls.length > CARD_IMAGE_SLOTS;
    const visibleCount = overflow ? CARD_IMAGE_SLOTS - 1 : Math.min(imageUrls.length, CARD_IMAGE_SLOTS);
    const moreCount = imageUrls.length - visibleCount;
    const interactive = onOpen != null;

    return (
        <ul className="grid grid-cols-4 gap-1.5" aria-label={{ de: 'Fotos der Bewertung', en: 'Review photos' }[locale]}>
            {imageUrls.slice(0, visibleCount).map((url, index) => (
                <li key={url}>
                    {interactive ? (
                        <button
                            type="button"
                            className="group relative aspect-square w-full cursor-pointer overflow-hidden rounded-md bg-muted outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            onClick={() => onOpen(index)}
                            aria-label={{ de: `Foto ${index + 1} ansehen`, en: `View photo ${index + 1}` }[locale]}
                        >
                            <AppImage
                                src={url}
                                alt=""
                                className="size-full object-cover transition-[filter] duration-300 ease-out group-hover:brightness-[0.92] group-active:brightness-[0.85]"
                            />
                        </button>
                    ) : (
                        <div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted">
                            <AppImage src={url} alt="" className="size-full object-cover" />
                        </div>
                    )}
                </li>
            ))}
            {overflow ? (
                <li>
                    {interactive ? (
                        <button
                            type="button"
                            className="relative aspect-square w-full cursor-pointer overflow-hidden rounded-md bg-muted outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            onClick={() => onOpen(visibleCount)}
                            aria-label={{ de: `${moreCount} weitere Fotos ansehen`, en: `View ${moreCount} more photos` }[locale]}
                        >
                            <AppImage src={imageUrls[visibleCount]!} alt="" className="size-full object-cover brightness-[0.45]" />
                            <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-white tabular-nums">
                                {{ de: `+${moreCount} mehr`, en: `+${moreCount} more` }[locale]}
                            </span>
                        </button>
                    ) : (
                        <div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted">
                            <AppImage src={imageUrls[visibleCount]!} alt="" className="size-full object-cover brightness-[0.45]" />
                            <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-white tabular-nums">
                                {{ de: `+${moreCount} mehr`, en: `+${moreCount} more` }[locale]}
                            </span>
                        </div>
                    )}
                </li>
            ) : null}
        </ul>
    );
}

function TestimonialGallery({
    imageUrls,
    index,
    onIndexChange,
}: {
    imageUrls: ReadonlyArray<string>;
    index: number;
    onIndexChange: (index: number) => void;
}) {
    const locale = useLocale();
    const total = imageUrls.length;
    const safeIndex = Math.max(0, Math.min(index, total - 1));
    const currentUrl = imageUrls[safeIndex];
    if (!currentUrl) return null;

    const goPrev = () => onIndexChange((safeIndex - 1 + total) % total);
    const goNext = () => onIndexChange((safeIndex + 1) % total);
    const ofLabel = { de: `${safeIndex + 1} von ${total}`, en: `${safeIndex + 1} of ${total}` }[locale];

    return (
        <div className="flex min-h-0 flex-col gap-3">
            <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-muted/60">
                <AppImage key={currentUrl} src={currentUrl} alt="" priority className="size-full object-cover" />
                {total > 1 ? (
                    <>
                        <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            aria-label={{ de: 'Vorheriges Foto', en: 'Previous photo' }[locale]}
                            onClick={goPrev}
                            className="absolute top-1/2 left-3 -translate-y-1/2 shadow-md"
                        >
                            <ChevronLeftIcon />
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            aria-label={{ de: 'Nächstes Foto', en: 'Next photo' }[locale]}
                            onClick={goNext}
                            className="absolute top-1/2 right-3 -translate-y-1/2 shadow-md"
                        >
                            <ChevronRightIcon />
                        </Button>
                        <span className="absolute right-3 bottom-3 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm">
                            {ofLabel}
                        </span>
                    </>
                ) : null}
            </div>

            {total > 1 ? (
                <ul
                    className="grid grid-cols-4 gap-1.5 @sm:grid-cols-5 @3xl:grid-cols-6"
                    aria-label={{ de: 'Alle Fotos', en: 'All photos' }[locale]}
                >
                    {imageUrls.map((url, thumbIndex) => {
                        const selected = thumbIndex === safeIndex;
                        return (
                            <li key={url}>
                                <button
                                    type="button"
                                    className={cn(
                                        'relative aspect-square w-full cursor-pointer overflow-hidden rounded-md bg-muted outline-none transition-[box-shadow,opacity] duration-200 ease-out focus-visible:ring-[3px] focus-visible:ring-ring/50',
                                        selected
                                            ? 'ring-2 ring-accent ring-offset-2 ring-offset-background'
                                            : 'opacity-80 hover:opacity-100',
                                    )}
                                    aria-current={selected ? 'true' : undefined}
                                    aria-label={{ de: `Foto ${thumbIndex + 1}`, en: `Photo ${thumbIndex + 1}` }[locale]}
                                    onClick={() => onIndexChange(thumbIndex)}
                                >
                                    <AppImage src={url} alt="" className="size-full object-cover" />
                                </button>
                            </li>
                        );
                    })}
                </ul>
            ) : null}
        </div>
    );
}

function TestimonialDetailCopy({ testimonial }: { testimonial: PageTestimonialCardModel }) {
    const locale = useLocale();

    return (
        <div className="flex flex-col gap-6">
            <DialogHeader className="gap-4 text-left">
                {testimonial.rating != null ? <TestimonialRating rating={testimonial.rating} /> : null}
                <div className="grid gap-3">
                    <TestimonialAuthor
                        authorName={testimonial.authorName}
                        authorProfilePictureUrl={testimonial.authorProfilePictureUrl}
                        location={testimonial.location}
                        size="lg"
                    />
                    <DialogTitle className="sr-only">{testimonial.authorName}</DialogTitle>
                    <DialogDescription className="sr-only">
                        {testimonial.location ?? { de: 'Kundenbewertung', en: 'Customer review' }[locale]}
                    </DialogDescription>
                </div>
            </DialogHeader>

            {testimonial.occasion ? (
                <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{{ de: 'Anlass', en: 'Occasion' }[locale]}:</span> {testimonial.occasion}
                </p>
            ) : null}

            <blockquote className="border-l-2 border-accent/40 pl-4 text-base/relaxed text-foreground">
                <p className="whitespace-pre-wrap">{testimonial.body}</p>
            </blockquote>
        </div>
    );
}

/** Presentational card face shared by public tiles and admin list cards. */
export function PageTestimonialCardFace({
    testimonial,
    className,
    header,
    footerAction,
    onOpenImage,
}: {
    testimonial: PageTestimonialCardModel;
    className?: string;
    /** Optional admin chips / meta above the rating row. */
    header?: ReactNode;
    footerAction?: ReactNode;
    /** When set, the photo strip is interactive. Omit inside a surrounding Link. */
    onOpenImage?: (index: number) => void;
}) {
    const imageUrls = testimonial.imageUrls ?? [];

    return (
        <figure className={cn('flex h-full flex-col gap-4', className)}>
            {header}
            <div className="flex items-start justify-between gap-3">
                {testimonial.rating != null ? <TestimonialRating rating={testimonial.rating} /> : <span />}
                {testimonial.occasion ? (
                    <p className="max-w-[50%] truncate text-right text-sm text-muted-foreground">{testimonial.occasion}</p>
                ) : null}
            </div>

            <blockquote className="text-base/relaxed text-foreground">
                <p className="line-clamp-4">{testimonial.body}</p>
            </blockquote>

            <TestimonialImageStrip imageUrls={imageUrls} onOpen={onOpenImage} />

            <div className="mt-auto flex items-center justify-between gap-3">
                <figcaption className="min-w-0">
                    <TestimonialAuthor
                        authorName={testimonial.authorName}
                        authorProfilePictureUrl={testimonial.authorProfilePictureUrl}
                        location={testimonial.location}
                    />
                </figcaption>
                {footerAction}
            </div>
        </figure>
    );
}

/** Controlled public detail dialog (gallery + full copy). Used by public cards and admin preview. */
export function PageTestimonialDetailDialog({
    testimonial,
    open,
    onOpenChange,
    imageIndex = 0,
    onImageIndexChange,
}: {
    testimonial: PageTestimonialCardModel;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    imageIndex?: number;
    onImageIndexChange?: (index: number) => void;
}) {
    const imageUrls = testimonial.imageUrls ?? [];
    const hasImages = imageUrls.length > 0;
    const [internalIndex, setInternalIndex] = useState(imageIndex);
    const controlled = onImageIndexChange != null;
    const index = controlled ? imageIndex : internalIndex;

    const setIndex = (next: number) => {
        if (onImageIndexChange) onImageIndexChange(next);
        else setInternalIndex(next);
    };

    useEffect(() => {
        if (open && !controlled) setInternalIndex(imageIndex);
    }, [open, imageIndex, controlled]);

    useEffect(() => {
        if (!open || imageUrls.length < 2) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                setIndex((index - 1 + imageUrls.length) % imageUrls.length);
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                setIndex((index + 1) % imageUrls.length);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
        // setIndex closes over latest index / callbacks for the active open session.
        // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open-session keyboard binding
    }, [open, imageUrls.length, index]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={cn('@container max-h-[90vh] overflow-y-auto', hasImages ? 'gap-0 p-0 sm:max-w-4xl lg:max-w-5xl' : 'sm:max-w-lg')}
            >
                {hasImages ? (
                    <div className="grid @3xl:grid-cols-[minmax(0,1.2fr)_minmax(17rem,0.8fr)]">
                        <div className="bg-muted/30 p-4 @md:p-5">
                            <TestimonialGallery imageUrls={imageUrls} index={index} onIndexChange={setIndex} />
                        </div>
                        <div className="p-6 pt-12 @md:p-8 @md:pt-12">
                            <TestimonialDetailCopy testimonial={testimonial} />
                        </div>
                    </div>
                ) : (
                    <div className="pt-2">
                        <TestimonialDetailCopy testimonial={testimonial} />
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

/** Curated public testimonial tile — clamped quote, photo strip, detail dialog. Used by `SectionPageTestimonials`. */
export function PageTestimonialCard({ testimonial, className }: { testimonial: PageTestimonialCardModel; className?: string }) {
    const locale = useLocale();
    const [open, setOpen] = useState(false);
    const [imageIndex, setImageIndex] = useState(0);
    const viewLabel = { de: 'Bewertung ansehen', en: 'View review' }[locale];

    const openAt = (index: number) => {
        setImageIndex(index);
        setOpen(true);
    };

    return (
        <>
            <PageTestimonialCardFace
                testimonial={testimonial}
                className={className}
                onOpenImage={openAt}
                footerAction={
                    <Button type="button" variant="link" size="sm" className="h-auto shrink-0 px-0" onClick={() => openAt(0)}>
                        {viewLabel}
                    </Button>
                }
            />
            <PageTestimonialDetailDialog
                testimonial={testimonial}
                open={open}
                onOpenChange={setOpen}
                imageIndex={imageIndex}
                onImageIndexChange={setImageIndex}
            />
        </>
    );
}
