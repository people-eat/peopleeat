import { Link } from '@tanstack/react-router';
import { MapPinIcon } from 'lucide-react';

import { formatCurrency } from '../../shared';
import { useLocale } from '../hooks/useLocale';
import { useTimeZone } from '../hooks/useTimeZone';
import { cn } from '../utils/cn';
import { Avatar, AvatarFallback, AvatarImage } from './base/avatar';
import { NotificationBadge } from './base/notification-badge';
import { StatusBadge } from './base/status-badge';
import { bookingRequestCardInteractionClassName } from './bookingRequestCardInteraction';
import { bookingRequestOfferStatusClassName, bookingRequestOfferStatusLabel } from './bookingRequestOfferStatus';
import { BookingStatusPill } from './BookingStatusPill';
import { callBookingOverviewHint } from './callBookingOverviewHint';
import type { CallBookingOverviewItem } from './callBookingOverviewHint';
import { CookProfileTags } from './CookProfileTags';

export type CustomerBookingRequestOfferCardOffer = {
    bookingRequestOfferId: string;
    status: string;
    userUnreadNotificationCount: number;
    testimonialMissing?: boolean;
    totalCentsCustomer: number | null;
    totalWithoutDiscountsCentsCustomer: number;
    configuredMenu: { title: string } | null;
    suggestedMenus: { title: string }[];
    callBookings?: readonly CallBookingOverviewItem[];
    cook: {
        city: string | null;
        cuisineStyle: string | null;
        cookingPhilosophy: string | null;
        user: {
            display: string;
            profilePicture: { url: string } | null;
        };
    };
};

function initialsFromDisplay(display: string): string {
    const parts = display.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

export function CustomerBookingRequestOfferCard({
    bookingRequestId,
    offer,
}: {
    bookingRequestId: string;
    offer: CustomerBookingRequestOfferCardOffer;
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const unreadCount = offer.userUnreadNotificationCount;
    const priceCents = offer.totalCentsCustomer ?? offer.totalWithoutDiscountsCentsCustomer;
    const hasMenu = offer.configuredMenu != null || offer.suggestedMenus.length > 0;
    const menuHint = offer.configuredMenu?.title
        ? offer.configuredMenu.title
        : offer.suggestedMenus.length > 0
          ? offer.suggestedMenus.map((menu) => menu.title).join(', ')
          : null;
    const callHint = callBookingOverviewHint(offer.callBookings, 'customer', locale, timeZone);
    const reviewMissing = offer.testimonialMissing === true;
    const reviewIsPrimaryAction = reviewMissing && !callHint?.openCall;
    const search = callHint?.openCall ? { tab: 'call' as const } : reviewMissing ? { tab: 'testimonial' as const } : undefined;
    const city = offer.cook.city?.trim() ?? '';
    const ctaLabel = reviewIsPrimaryAction
        ? { de: 'Bewertung abgeben', en: 'Leave a review' }[locale]
        : hasMenu
          ? { de: 'Menüvorschlag anzeigen', en: 'Show menu suggestion' }[locale]
          : { de: 'Angebot anzeigen', en: 'View offer' }[locale];

    return (
        <Link
            to="/{-$locale}/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId"
            params={{ bookingRequestId, bookingRequestOfferId: offer.bookingRequestOfferId }}
            search={search}
            className={cn(
                'relative flex h-full flex-col justify-between rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm',
                bookingRequestCardInteractionClassName,
            )}
        >
            <NotificationBadge
                count={unreadCount}
                label={
                    {
                        de: `${unreadCount} ungelesene Benachrichtigungen`,
                        en: `${unreadCount} unread notifications`,
                    }[locale]
                }
            />

            <div className="flex min-w-0 flex-col gap-3">
                <div className={cn('flex items-start gap-2', reviewMissing ? 'justify-between' : 'justify-end')}>
                    {reviewMissing ? <StatusBadge tone="warning">{{ de: 'Bewertung', en: 'Review' }[locale]}</StatusBadge> : null}
                    <BookingStatusPill className={cn('w-fit shrink-0', bookingRequestOfferStatusClassName(offer.status))}>
                        {bookingRequestOfferStatusLabel(offer.status, locale, 'customer')}
                    </BookingStatusPill>
                </div>

                <div className="flex items-start gap-3">
                    <Avatar className="size-16 shrink-0 rounded-lg text-base">
                        {offer.cook.user.profilePicture != null ? (
                            <AvatarImage src={offer.cook.user.profilePicture.url} alt="" className="rounded-lg object-cover" />
                        ) : null}
                        <AvatarFallback className="rounded-lg">{initialsFromDisplay(offer.cook.user.display)}</AvatarFallback>
                    </Avatar>
                    <div className="grid min-w-0 flex-1 gap-1">
                        <h3 className="line-clamp-1 font-semibold leading-snug">{offer.cook.user.display}</h3>
                        {city.length > 0 ? (
                            <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                                <MapPinIcon className="size-3.5 shrink-0 text-muted-foreground/70" aria-hidden />
                                <span className="truncate">{city}</span>
                            </p>
                        ) : null}
                    </div>
                </div>

                <CookProfileTags cuisineStyle={offer.cook.cuisineStyle} cookingPhilosophy={offer.cook.cookingPhilosophy} />

                {menuHint ? <p className="line-clamp-2 text-sm text-foreground">{menuHint}</p> : null}
                <p className="flex items-center justify-between gap-3 text-sm font-semibold">
                    <span>{{ de: 'Gesamtpreis', en: 'Total' }[locale]}</span>
                    <span className="shrink-0">{formatCurrency(priceCents, { locale })}</span>
                </p>

                {callHint ? <p className="text-sm font-medium text-foreground">{callHint.label}</p> : null}
            </div>

            <span className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
                {ctaLabel}
            </span>
        </Link>
    );
}
