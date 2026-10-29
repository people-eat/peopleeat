import { Link } from '@tanstack/react-router';
import { MapPinIcon, StarIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import type { Locale } from '../../shared/locale';
import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import { Avatar, AvatarFallback, AvatarImage } from './base/avatar';
import { bookingRequestCardInteractionClassName } from './bookingRequestCardInteraction';
import { CookProfileTags } from './CookProfileTags';

export type PublicCookCardCook = {
    cookId: string;
    cuisineStyle: string | null;
    cookingPhilosophy?: string | null;
    city: string | null;
    /** Omit on admin / cook self-preview when aggregate rating is unavailable. */
    rating?: {
        averageRating: number | null;
        reviewCount: number;
    };
    user: {
        display: string;
        profilePicture: { url: string } | null;
    };
};

function initialsFromName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

function CookCardRating({ rating, locale }: { rating: NonNullable<PublicCookCardCook['rating']>; locale: Locale }) {
    if (rating.reviewCount <= 0 || rating.averageRating == null) return null;

    const filledStars = Math.round(rating.averageRating);
    const summary = `${rating.averageRating.toFixed(1)} · ${rating.reviewCount} ${{ de: 'Bewertungen', en: 'reviews' }[locale]}`;

    return (
        <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5" role="img" aria-label={summary}>
                {Array.from({ length: 5 }, (_, index) => (
                    <StarIcon
                        key={index}
                        aria-hidden
                        className={cn('size-3', index < filledStars ? 'fill-accent text-accent' : 'text-muted-foreground/30')}
                    />
                ))}
            </div>
            <span className="text-[11px] leading-none text-muted-foreground">{summary}</span>
        </div>
    );
}

function PublicCookCardBody({ cook, locale, showCity }: { cook: PublicCookCardCook; locale: Locale; showCity: boolean }) {
    const name = cook.user.display;
    const city = showCity ? cook.city?.trim() || null : null;

    return (
        <>
            <div className="relative aspect-square w-full overflow-hidden bg-muted">
                <Avatar className="size-full rounded-none text-2xl">
                    {cook.user.profilePicture != null && (
                        <AvatarImage src={cook.user.profilePicture.url} alt="" className="rounded-none object-cover" />
                    )}
                    <AvatarFallback className="rounded-none text-2xl">{initialsFromName(name)}</AvatarFallback>
                </Avatar>
            </div>

            <div className="flex flex-1 flex-col gap-1.5 p-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                    {city ? (
                        <p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                            <MapPinIcon aria-hidden className="size-3 shrink-0" />
                            <span className="truncate">{city}</span>
                        </p>
                    ) : null}
                </div>

                <CookProfileTags cuisineStyle={cook.cuisineStyle} cookingPhilosophy={cook.cookingPhilosophy} />

                {cook.rating != null && cook.rating.reviewCount > 0 && cook.rating.averageRating != null ? (
                    <div className="mt-auto pt-0.5">
                        <CookCardRating rating={cook.rating} locale={locale} />
                    </div>
                ) : null}
            </div>
        </>
    );
}

/**
 * Public discovery card for a cook — square photo, name, city, cuisine / philosophy
 * pills (`CookProfileTags`), and compact review stars. Shared by `/chefs` and city /
 * partner / occasion featured lists. No biography summary.
 *
 * Pass `interactive={false}` for cook self-preview (static chrome, no navigation).
 */
export function PublicCookCard({
    cook,
    className,
    interactive = true,
    showCity = true,
}: {
    cook: PublicCookCardCook;
    className?: string;
    interactive?: boolean;
    /** Show travel-origin city under the name. Partners may turn off. */
    showCity?: boolean;
}) {
    const locale = useLocale();
    const cardClassName = cn(
        'flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm',
        interactive && bookingRequestCardInteractionClassName,
        className,
    );
    const body: ReactNode = <PublicCookCardBody cook={cook} locale={locale} showCity={showCity} />;

    if (!interactive) {
        return <div className={cardClassName}>{body}</div>;
    }

    return (
        <Link to="/{-$locale}/chefs/$cookId" params={{ cookId: cook.cookId }} className={cardClassName}>
            {body}
        </Link>
    );
}
