import { Link } from '@tanstack/react-router';
import { ChevronLeftIcon, ChevronRightIcon, StarIcon } from 'lucide-react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode, UIEvent } from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { formatDate } from '../../shared';
import { useIsMobile } from '../hooks/use-mobile';
import { useLocale } from '../hooks/useLocale';
import { useTimeZone } from '../hooks/useTimeZone';
import { cn } from '../utils/cn';
import { AppImage } from './AppImage';
import { Avatar, AvatarFallback, AvatarImage } from './base/avatar';
import { Button } from './base/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './base/dialog';
import { Sheet, SheetClose, SheetContent } from './base/sheet';

export type PageTestimonialCardModel = {
    authorName: string;
    authorProfilePictureUrl?: string | null;
    location: string | null;
    occasion: string | null;
    body: string;
    rating: number | null;
    imageUrls?: ReadonlyArray<string>;
    /** When the review was written (`CustomerTestimonial` / `CookTestimonial.createdAt`). */
    createdAt?: string | null;
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
    createdAt,
    locationPlacement = 'hidden',
    size = 'md',
}: {
    authorName: string;
    authorProfilePictureUrl?: string | null;
    location: string | null;
    createdAt?: string | null;
    /** Card tiles omit the city; detail dialog uses one line: `{date} in {city}`. */
    locationPlacement?: 'hidden' | 'with-date';
    size?: 'md' | 'lg';
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const writtenAt = createdAt ? formatDate(createdAt, { locale, timeZone, dateStyle: 'long' }) : null;
    const city = location?.trim() || null;

    let meta: string | null = null;
    if (locationPlacement === 'with-date') {
        if (writtenAt && city) {
            meta = { de: `${writtenAt} in ${city}`, en: `${writtenAt} in ${city}` }[locale];
        } else {
            meta = writtenAt ?? city;
        }
    } else {
        meta = writtenAt;
    }

    return (
        <div className={cn('flex min-w-0 items-center gap-3', size === 'lg' && 'gap-4')}>
            <Avatar className={cn('shrink-0', size === 'lg' ? 'size-12' : 'size-10')}>
                {authorProfilePictureUrl ? <AvatarImage src={authorProfilePictureUrl} alt="" /> : null}
                <AvatarFallback className={size === 'lg' ? 'text-sm' : 'text-xs'}>{initialsFromName(authorName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 text-sm">
                <div className={cn('truncate font-medium text-foreground', size === 'lg' && 'text-base')}>{authorName}</div>
                {meta ? <div className="truncate text-muted-foreground">{meta}</div> : null}
            </div>
        </div>
    );
}

function experienceTitle(authorName: string, occasion: string | null, locale: 'de' | 'en'): string {
    if (occasion) {
        return {
            de: `${authorName}s Experience bei „${occasion}“`,
            en: `${authorName}'s experience at ${occasion}`,
        }[locale];
    }
    return {
        de: `${authorName}s Experience`,
        en: `${authorName}'s experience`,
    }[locale];
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
                            onClick={(event) => {
                                event.stopPropagation();
                                onOpen(index);
                            }}
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
                            onClick={(event) => {
                                event.stopPropagation();
                                onOpen(visibleCount);
                            }}
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
    bleed = false,
}: {
    imageUrls: ReadonlyArray<string>;
    index: number;
    onIndexChange: (index: number) => void;
    /** Full-bleed hero for the mobile sheet. Dialog keeps the rounded frame. */
    bleed?: boolean;
}) {
    const locale = useLocale();
    const scrollerRef = useRef<HTMLDivElement>(null);
    const total = imageUrls.length;
    const safeIndex = total === 0 ? 0 : Math.max(0, Math.min(index, total - 1));

    // Instant sync for arrows / thumbs / keyboard / open-at-index (swipe uses native snap).
    useLayoutEffect(() => {
        const scroller = scrollerRef.current;
        if (scroller == null || scroller.clientWidth === 0 || total === 0) return;
        const targetLeft = safeIndex * scroller.clientWidth;
        if (Math.abs(scroller.scrollLeft - targetLeft) < 2) return;
        scroller.scrollTo({ left: targetLeft, behavior: 'auto' });
    }, [safeIndex, total]);

    if (total === 0) return null;

    const goPrev = () => onIndexChange((safeIndex - 1 + total) % total);
    const goNext = () => onIndexChange((safeIndex + 1) % total);
    const ofLabel = { de: `${safeIndex + 1} von ${total}`, en: `${safeIndex + 1} of ${total}` }[locale];

    const onScrollerScroll = (event: UIEvent<HTMLDivElement>) => {
        const scroller = event.currentTarget;
        if (scroller.clientWidth === 0) return;
        const nextIndex = Math.round(scroller.scrollLeft / scroller.clientWidth);
        if (nextIndex !== safeIndex && nextIndex >= 0 && nextIndex < total) {
            onIndexChange(nextIndex);
        }
    };

    return (
        <div className={cn('flex min-h-0 flex-col', bleed ? 'gap-0' : 'gap-3')}>
            <div className={cn('relative aspect-square w-full overflow-hidden bg-muted/60', bleed ? null : 'rounded-xl')}>
                <div
                    ref={scrollerRef}
                    className="flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain no-scrollbar"
                    onScroll={onScrollerScroll}
                    aria-roledescription="carousel"
                    aria-label={{ de: 'Fotos der Bewertung', en: 'Review photos' }[locale]}
                >
                    {imageUrls.map((url, imageIndex) => (
                        <div
                            key={url}
                            className="relative aspect-square w-full shrink-0 snap-center snap-always"
                            aria-hidden={imageIndex !== safeIndex}
                        >
                            <AppImage
                                src={url}
                                alt=""
                                priority={imageIndex === safeIndex}
                                draggable={false}
                                className="size-full object-cover select-none"
                            />
                        </div>
                    ))}
                </div>
                {total > 1 ? (
                    <>
                        <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            aria-label={{ de: 'Vorheriges Foto', en: 'Previous photo' }[locale]}
                            onClick={goPrev}
                            className="absolute top-1/2 left-3 z-10 -translate-y-1/2 shadow-md"
                        >
                            <ChevronLeftIcon />
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            aria-label={{ de: 'Nächstes Foto', en: 'Next photo' }[locale]}
                            onClick={goNext}
                            className="absolute top-1/2 right-3 z-10 -translate-y-1/2 shadow-md"
                        >
                            <ChevronRightIcon />
                        </Button>
                        <span className="absolute right-3 bottom-3 z-10 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm">
                            {ofLabel}
                        </span>
                    </>
                ) : null}
            </div>

            {total > 1 ? (
                <ul
                    className={cn('grid grid-cols-4 gap-1.5 @sm:grid-cols-5 @3xl:grid-cols-6', bleed && 'px-4 pt-3')}
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

function TestimonialDetailCopy({
    testimonial,
    showBookingCta = false,
}: {
    testimonial: PageTestimonialCardModel;
    /** Content pages only. Plan funnel keeps testimonials proof-only. */
    showBookingCta?: boolean;
}) {
    const locale = useLocale();
    const occasion = testimonial.occasion?.trim() || null;
    const title = experienceTitle(testimonial.authorName, occasion, locale);

    const occasionQuestion = occasion
        ? {
              de: `Auch auf der Suche nach einer Experience wie „${occasion}“?`,
              en: `Also looking for a ${occasion} experience?`,
          }[locale]
        : {
              de: 'Lust auf euren eigenen Abend mit Privatkoch?',
              en: 'Ready for your own private chef evening?',
          }[locale];

    return (
        <div className="flex flex-col gap-6">
            <DialogHeader className="gap-3 text-left">
                <DialogTitle className="text-balance text-lg/snug font-medium text-foreground @md:text-2xl/snug">{title}</DialogTitle>
                {testimonial.rating != null ? <TestimonialRating rating={testimonial.rating} /> : null}
                <DialogDescription className="sr-only">
                    {testimonial.location ?? { de: 'Kundenbewertung', en: 'Customer review' }[locale]}
                </DialogDescription>
            </DialogHeader>

            <blockquote className="border-l-2 border-accent/40 pl-4 text-base/relaxed text-foreground">
                <p className="whitespace-pre-wrap">{testimonial.body}</p>
            </blockquote>

            <TestimonialAuthor
                authorName={testimonial.authorName}
                authorProfilePictureUrl={testimonial.authorProfilePictureUrl}
                location={testimonial.location}
                createdAt={testimonial.createdAt}
                locationPlacement="with-date"
                size="lg"
            />

            {showBookingCta ? (
                <div className="flex flex-col gap-3 border-t border-border pt-6">
                    <p className="text-center text-base font-medium text-foreground">{occasionQuestion}</p>
                    <div className="flex flex-col items-center gap-2">
                        <Button asChild className="w-full @sm:w-auto">
                            <Link to="/{-$locale}/booking-request/form" search={occasion ? { occasion } : {}}>
                                {{ de: 'Anfrage starten', en: 'Start a request' }[locale]}
                            </Link>
                        </Button>
                        <p className="text-center text-sm text-muted-foreground">
                            {{ de: 'Kostenlos und unverbindlich', en: 'Free and no obligation' }[locale]}
                        </p>
                    </div>
                </div>
            ) : null}
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
                {testimonial.occasion ? (
                    <p className="min-w-0 flex-1 truncate text-base font-medium text-foreground">{testimonial.occasion}</p>
                ) : (
                    <span />
                )}
                {testimonial.rating != null ? <TestimonialRating rating={testimonial.rating} className="shrink-0" /> : null}
            </div>

            <blockquote className="border-l-2 border-accent/40 pl-4 text-base/relaxed text-foreground">
                <p className="line-clamp-4">{testimonial.body}</p>
            </blockquote>

            <TestimonialImageStrip imageUrls={imageUrls} onOpen={onOpenImage} />

            <div className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
                <figcaption className="min-w-0 flex-1 basis-40">
                    <TestimonialAuthor
                        authorName={testimonial.authorName}
                        authorProfilePictureUrl={testimonial.authorProfilePictureUrl}
                        location={testimonial.location}
                        createdAt={testimonial.createdAt}
                    />
                </figcaption>
                {footerAction != null ? <div className="shrink-0">{footerAction}</div> : null}
            </div>
        </figure>
    );
}

function TestimonialDetailSheet({
    testimonial,
    open,
    onOpenChange,
    imageUrls,
    imageIndex,
    onImageIndexChange,
    showBookingCta,
}: {
    testimonial: PageTestimonialCardModel;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    imageUrls: ReadonlyArray<string>;
    imageIndex: number;
    onImageIndexChange: (index: number) => void;
    showBookingCta: boolean;
}) {
    const locale = useLocale();
    const hasImages = imageUrls.length > 0;
    const backLabel = { de: 'Zurück', en: 'Back' }[locale];

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                showCloseButton={false}
                className="h-dvh w-full max-w-none gap-0 overflow-hidden border-0 p-0 sm:max-w-none"
            >
                <div className="flex shrink-0 items-center bg-background px-[max(0.75rem,env(safe-area-inset-left))] pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
                    <SheetClose asChild>
                        <Button type="button" variant="outline">
                            <ChevronLeftIcon />
                            {backLabel}
                        </Button>
                    </SheetClose>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
                    {hasImages ? (
                        <TestimonialGallery imageUrls={imageUrls} index={imageIndex} onIndexChange={onImageIndexChange} bleed />
                    ) : null}
                    <div className="px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                        <TestimonialDetailCopy testimonial={testimonial} showBookingCta={showBookingCta} />
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

/** Controlled public detail. Full-page sheet below `md`, centered dialog from `md` up. */
export function PageTestimonialDetailDialog({
    testimonial,
    open,
    onOpenChange,
    initialImageIndex = 0,
    showBookingCta = false,
}: {
    testimonial: PageTestimonialCardModel;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Applied when the dialog opens (e.g. photo strip click). */
    initialImageIndex?: number;
    /** Content pages only. Plan funnel and admin preview keep this off. */
    showBookingCta?: boolean;
}) {
    const imageUrls = testimonial.imageUrls ?? [];
    const hasImages = imageUrls.length > 0;
    const isMobile = useIsMobile();
    const [imageIndex, setImageIndex] = useState(initialImageIndex);

    useEffect(() => {
        if (open) setImageIndex(initialImageIndex);
    }, [open, initialImageIndex]);

    useEffect(() => {
        if (!open || imageUrls.length < 2) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowLeft') {
                event.preventDefault();
                setImageIndex((current) => (current - 1 + imageUrls.length) % imageUrls.length);
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                setImageIndex((current) => (current + 1) % imageUrls.length);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, imageUrls.length]);

    if (isMobile) {
        return (
            <TestimonialDetailSheet
                testimonial={testimonial}
                open={open}
                onOpenChange={onOpenChange}
                imageUrls={imageUrls}
                imageIndex={imageIndex}
                onImageIndexChange={setImageIndex}
                showBookingCta={showBookingCta}
            />
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={cn(
                    '@container max-h-[90vh]',
                    hasImages ? 'gap-0 overflow-y-auto p-0 sm:max-w-4xl lg:max-w-5xl @3xl:overflow-hidden' : 'overflow-y-auto sm:max-w-lg',
                )}
            >
                {hasImages ? (
                    <div className="grid @3xl:grid-cols-2">
                        <div className="bg-muted/30 p-4 @md:p-5 @3xl:max-h-[90vh] @3xl:overflow-y-auto">
                            <TestimonialGallery imageUrls={imageUrls} index={imageIndex} onIndexChange={setImageIndex} />
                        </div>
                        <div className="p-6 pt-12 @md:p-8 @md:pt-12 @3xl:max-h-[90vh] @3xl:overflow-y-auto">
                            <TestimonialDetailCopy testimonial={testimonial} showBookingCta={showBookingCta} />
                        </div>
                    </div>
                ) : (
                    <div className="pt-2">
                        <TestimonialDetailCopy testimonial={testimonial} showBookingCta={showBookingCta} />
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

/** Curated public testimonial tile — clamped quote, photo strip, detail dialog. Used by `SectionPageTestimonials`. */
export function PageTestimonialCard({
    testimonial,
    className,
    header,
    showBookingCta = false,
}: {
    testimonial: PageTestimonialCardModel;
    className?: string;
    /** Optional admin preview chips (e.g. pending-review visibility). */
    header?: ReactNode;
    /** Content pages only. Plan funnel keeps testimonials proof-only. */
    showBookingCta?: boolean;
}) {
    const locale = useLocale();
    const [open, setOpen] = useState(false);
    const [imageIndex, setImageIndex] = useState(0);
    const viewLabel = { de: 'Bewertung ansehen', en: 'View review' }[locale];

    const openAt = (index: number) => {
        setImageIndex(index);
        setOpen(true);
    };

    const onCardKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openAt(0);
        }
    };

    return (
        <>
            <div
                role="button"
                tabIndex={0}
                aria-label={viewLabel}
                className={cn(
                    'group/testimonial flex h-full cursor-pointer flex-col rounded-xl p-3 outline-none transition-colors duration-200 ease-out',
                    'hover:bg-muted/40 active:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring',
                    className,
                )}
                onClick={() => openAt(0)}
                onKeyDown={onCardKeyDown}
            >
                <PageTestimonialCardFace
                    testimonial={testimonial}
                    className="min-h-0 flex-1"
                    header={header}
                    onOpenImage={openAt}
                    footerAction={
                        <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="h-auto shrink-0 px-0 transition-colors duration-200 ease-out group-hover/testimonial:underline"
                            onClick={(event) => {
                                event.stopPropagation();
                                openAt(0);
                            }}
                        >
                            {viewLabel}
                        </Button>
                    }
                />
            </div>
            <PageTestimonialDetailDialog
                testimonial={testimonial}
                open={open}
                onOpenChange={setOpen}
                initialImageIndex={imageIndex}
                showBookingCta={showBookingCta}
            />
        </>
    );
}
