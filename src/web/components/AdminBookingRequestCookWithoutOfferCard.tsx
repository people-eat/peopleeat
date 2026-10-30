import { Link } from '@tanstack/react-router';
import { MapPinIcon } from 'lucide-react';

import { formatCurrency, userDisplayName } from '../../shared';
import { useLocale } from '../hooks/useLocale';
import type { Locale } from '../utils/locale';
import { Avatar, AvatarFallback, AvatarImage } from './base/avatar';
import { Button } from './base/button';
import { BookingStatusPill } from './BookingStatusPill';
import { CookProfileTags } from './CookProfileTags';

type AdminBookingRequestCookWithoutOfferCardCook = {
    cookId: string;
    cuisineStyle: string | null;
    cookingPhilosophy: string | null;
    exactTravelOriginAddress: { city: string } | null;
    user: {
        firstName: string;
        lastName: string;
        profilePicture: { url: string } | null;
    };
};

export type AdminBookingRequestCookWithoutOfferCardRow = {
    estimatedTravelDistanceKm: number;
    estimatedTravelExpensesCents: number;
    suggestedMenuPriceCents: number;
    notifiedAt: string | null;
    cook: AdminBookingRequestCookWithoutOfferCardCook;
};

function formatTravelDistanceKm(km: number, locale: Locale): string {
    return new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-US', {
        maximumFractionDigits: 1,
        minimumFractionDigits: 0,
    }).format(km);
}

function initialsFromDisplay(display: string): string {
    const parts = display.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

export function AdminBookingRequestCookWithoutOfferCard({
    bookingRequestId,
    cookInTravelRadius,
    isPublicationApproved,
    hasAcceptedOffer,
    notifyBusy,
    onNotify,
}: {
    bookingRequestId: string;
    cookInTravelRadius: AdminBookingRequestCookWithoutOfferCardRow;
    isPublicationApproved: boolean;
    hasAcceptedOffer: boolean;
    notifyBusy: boolean;
    onNotify: (cookId: string) => void;
}) {
    const locale = useLocale();
    const cookName = userDisplayName(cookInTravelRadius.cook.user);
    const city = cookInTravelRadius.cook.exactTravelOriginAddress?.city.trim() ?? '';
    const alreadyNotified = cookInTravelRadius.notifiedAt != null;
    const distanceLabel = `${formatTravelDistanceKm(cookInTravelRadius.estimatedTravelDistanceKm, locale)} km`;

    return (
        <div className="relative flex h-full flex-col justify-between rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm">
            <div className="flex min-w-0 flex-col gap-3">
                <BookingStatusPill hue={alreadyNotified ? 'blue' : 'yellow'} className="w-fit self-end">
                    {alreadyNotified
                        ? { de: 'Benachrichtigt', en: 'Notified' }[locale]
                        : { de: 'Noch nicht benachrichtigt', en: 'Not yet notified' }[locale]}
                </BookingStatusPill>

                <div className="flex items-start gap-3">
                    <Avatar className="size-12 shrink-0 rounded-lg text-sm">
                        {cookInTravelRadius.cook.user.profilePicture != null ? (
                            <AvatarImage src={cookInTravelRadius.cook.user.profilePicture.url} alt="" className="rounded-lg object-cover" />
                        ) : null}
                        <AvatarFallback className="rounded-lg">{initialsFromDisplay(cookName)}</AvatarFallback>
                    </Avatar>
                    <div className="grid min-w-0 flex-1 gap-1">
                        <h3 className="line-clamp-1 font-semibold leading-snug">{cookName}</h3>
                        {city.length > 0 ? (
                            <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                                <MapPinIcon className="size-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
                                <span className="truncate">{city}</span>
                            </p>
                        ) : null}
                    </div>
                </div>

                <CookProfileTags
                    cuisineStyle={cookInTravelRadius.cook.cuisineStyle}
                    cookingPhilosophy={cookInTravelRadius.cook.cookingPhilosophy}
                />

                <dl className="grid gap-1.5 text-sm">
                    <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted-foreground">{{ de: 'Anfahrt', en: 'Travel' }[locale]}</dt>
                        <dd className="shrink-0 font-semibold tabular-nums">{distanceLabel}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted-foreground">{{ de: 'Reisekosten ca.', en: 'Travel est.' }[locale]}</dt>
                        <dd className="shrink-0 font-semibold tabular-nums">
                            {formatCurrency(cookInTravelRadius.estimatedTravelExpensesCents, {
                                locale,
                                maximumFractionDigits: 0,
                            })}
                        </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted-foreground">{{ de: 'Menüpreis-Vorschlag', en: 'Suggested menu' }[locale]}</dt>
                        <dd className="shrink-0 font-semibold tabular-nums">
                            {formatCurrency(cookInTravelRadius.suggestedMenuPriceCents, {
                                locale,
                                maximumFractionDigits: 0,
                            })}
                        </dd>
                    </div>
                </dl>

                <Link
                    to="/{-$locale}/admin/users/$userId"
                    params={{ userId: cookInTravelRadius.cook.cookId }}
                    className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                    {{ de: 'Profil anzeigen', en: 'View profile' }[locale]}
                </Link>
            </div>

            <div className="mt-4 flex flex-col gap-2">
                <Link
                    to="/{-$locale}/admin/booking-requests/$bookingRequestId/offers/create"
                    params={{ bookingRequestId }}
                    search={{ cookId: cookInTravelRadius.cook.cookId }}
                    className="inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                >
                    {{ de: 'Angebot erstellen', en: 'Create offer' }[locale]}
                </Link>
                {hasAcceptedOffer ? null : (
                    <span
                        className="block"
                        title={
                            isPublicationApproved ? undefined : { de: 'Erst nach Freigabe möglich', en: 'Available after approval' }[locale]
                        }
                    >
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            disabled={!isPublicationApproved || notifyBusy}
                            onClick={() => onNotify(cookInTravelRadius.cook.cookId)}
                        >
                            {alreadyNotified
                                ? { de: 'Erneut benachrichtigen', en: 'Send again' }[locale]
                                : { de: 'Auch diesem Koch vorschlagen', en: 'Suggest to this cook too' }[locale]}
                        </Button>
                    </span>
                )}
            </div>
        </div>
    );
}
