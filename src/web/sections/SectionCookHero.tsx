import { Link } from '@tanstack/react-router';
import { ArrowLeftIcon, MapPinIcon, StarIcon } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '../components/base/avatar';
import { Button } from '../components/base/button';
import { CookProfileTags } from '../components/CookProfileTags';
import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';

type SectionCookHeroRating = {
    averageRating: number | null;
    reviewCount: number;
};

export type SectionCookHeroCook = {
    displayName: string;
    profilePictureUrl: string | null;
    city: string | null;
    cuisineStyle: string | null;
    cookingPhilosophy: string | null;
    biographySummary: string;
    // Omit entirely to hide the rating row — a defined value always renders,
    // including zero reviews (e.g. cook self-preview via `Cook.rating`).
    rating?: SectionCookHeroRating;
};

function initialsFromName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

function CookRating({ rating }: { rating: SectionCookHeroRating }) {
    const locale = useLocale();
    const hasReviews = rating.reviewCount > 0 && rating.averageRating != null;
    const filledStars = hasReviews ? Math.round(rating.averageRating!) : 0;
    const summary = hasReviews
        ? `${rating.averageRating!.toFixed(1)} · ${rating.reviewCount} ${{ de: 'Bewertungen', en: 'reviews' }[locale]}`
        : { de: 'Noch keine Bewertungen', en: 'No reviews yet' }[locale];

    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-1" role="img" aria-label={summary}>
                {Array.from({ length: 5 }, (_, index) => (
                    <StarIcon
                        key={index}
                        aria-hidden
                        className={cn('size-5', index < filledStars ? 'fill-accent text-accent' : 'text-muted-foreground/30')}
                    />
                ))}
            </div>
            <span className="text-sm text-muted-foreground">{summary}</span>
        </div>
    );
}

export function SectionCookHero({
    cook,
    showChefsIndexLink = true,
    onBookCtaClick,
}: {
    cook: SectionCookHeroCook;
    showChefsIndexLink?: boolean;
    /** Fired when the visitor clicks the booking-request CTA (public chef page). */
    onBookCtaClick?: () => void;
}) {
    const locale = useLocale();

    return (
        <section className="mx-auto w-full max-w-7xl px-4 @lg:px-6">
            {showChefsIndexLink ? (
                <Button asChild variant="link" className="h-auto gap-1.5 -mx-2 px-2 text-muted-foreground">
                    <Link to="/{-$locale}/chefs">
                        <ArrowLeftIcon aria-hidden />
                        {{ de: 'Alle Köche', en: 'All chefs' }[locale]}
                    </Link>
                </Button>
            ) : null}

            {/*
              Stack until ~48rem so the square photo never fights the copy in the
              tablet band; row layout only when both columns have room.
            */}
            <div
                className={cn('flex flex-col gap-8 @3xl:flex-row @3xl:items-center @3xl:gap-10 @4xl:gap-12', showChefsIndexLink && 'mt-4')}
            >
                <div className="relative mx-auto aspect-square w-full max-w-sm shrink-0 overflow-hidden rounded-2xl bg-muted @sm:max-w-md @3xl:mx-0 @3xl:w-72 @3xl:max-w-none @4xl:w-80 @5xl:w-96">
                    <Avatar className="size-full rounded-2xl text-5xl @3xl:text-6xl @4xl:text-7xl">
                        {cook.profilePictureUrl != null && (
                            <AvatarImage src={cook.profilePictureUrl} alt="" className="rounded-2xl object-cover" />
                        )}
                        <AvatarFallback className="rounded-2xl text-5xl @3xl:text-6xl @4xl:text-7xl">
                            {initialsFromName(cook.displayName)}
                        </AvatarFallback>
                    </Avatar>
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-4">
                    <h1 className="font-serif text-3xl font-light tracking-tight @sm:text-4xl @3xl:text-5xl">{cook.displayName}</h1>

                    {cook.city != null && cook.city.trim().length > 0 ? (
                        <p className="flex items-center gap-1.5 text-muted-foreground">
                            <MapPinIcon aria-hidden className="size-4 shrink-0" />
                            <span>{cook.city}</span>
                        </p>
                    ) : null}

                    <CookProfileTags cuisineStyle={cook.cuisineStyle} cookingPhilosophy={cook.cookingPhilosophy} size="md" />

                    {cook.biographySummary.trim().length > 0 ? (
                        <p className="max-w-xl text-base/relaxed text-muted-foreground">{cook.biographySummary}</p>
                    ) : null}

                    {cook.rating != null ? <CookRating rating={cook.rating} /> : null}

                    <div className="inline-grid min-w-64 justify-items-stretch gap-2 self-center pt-2 @3xl:self-start">
                        <Button asChild size="lg" className="px-8">
                            <Link to="/{-$locale}/booking-request/form" onClick={onBookCtaClick}>
                                {{ de: 'Anfrage senden', en: 'Send request' }[locale]}
                            </Link>
                        </Button>
                        <p className="text-center text-sm text-muted-foreground @3xl:text-left">
                            {
                                {
                                    de: 'Unverbindlich und kostenlos',
                                    en: 'Free of charge and without obligation',
                                }[locale]
                            }
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
