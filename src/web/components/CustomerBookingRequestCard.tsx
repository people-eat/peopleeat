import { Link } from '@tanstack/react-router';
import { CalendarIcon, MapPinIcon, UsersIcon } from 'lucide-react';

import { formatDate, formatParticipants } from '../../shared';
import { bookingRequestStatusHue, bookingRequestStatusLabel } from '../../shared/bookingRequestStatus';
import type { Locale } from '../../shared/locale';
import type { GqlCBookingRequestStatus } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { useTimeZone } from '../hooks/useTimeZone';
import { cn } from '../utils/cn';
import { Avatar, AvatarFallback, AvatarImage } from './base/avatar';
import { NotificationBadge } from './base/notification-badge';
import { StatusBadge } from './base/status-badge';
import { Tooltip, TooltipContent, TooltipTrigger } from './base/tooltip';
import { bookingRequestCardInteractionClassName } from './bookingRequestCardInteraction';
import { BookingStatusPill } from './BookingStatusPill';
import { callBookingOverviewHintAcrossOffers } from './callBookingOverviewHint';
import type { CallBookingOverviewItem } from './callBookingOverviewHint';

type CustomerBookingRequestCardParticipant = {
    type: 'ADULT' | 'DISCOUNTED' | string;
};

type CustomerBookingRequestCardOffer = {
    bookingRequestOfferId: string;
    userUnreadNotificationCount: number;
    testimonialMissing?: boolean;
    callBookings?: readonly CallBookingOverviewItem[];
    cook: {
        cookId: string;
        user: {
            display: string;
            profilePicture: { url: string } | null;
        };
    };
};

export type CustomerBookingRequestCardRequest = {
    bookingRequestId: string;
    status: GqlCBookingRequestStatus;
    occasion: string;
    dateTime: string;
    exactEventAddress: {
        displayText: string;
        city: string;
    };
    participants: CustomerBookingRequestCardParticipant[];
    offers: CustomerBookingRequestCardOffer[];
};

type OfferChipModel = {
    cookId: string;
    bookingRequestOfferId: string;
    display: string;
    profilePictureUrl: string | null;
    unreadCount: number;
};

type CardPrimaryDestination =
    | {
          to: '/{-$locale}/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId';
          params: { bookingRequestId: string; bookingRequestOfferId: string };
          search?: { tab: 'chat' | 'call' | 'testimonial' };
      }
    | {
          to: '/{-$locale}/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId/checkout';
          params: { bookingRequestId: string; bookingRequestOfferId: string };
          search?: undefined;
      }
    | {
          to: '/{-$locale}/profile/booking-requests/$bookingRequestId';
          params: { bookingRequestId: string };
          search?: undefined;
      };

/** Optional overview Attention folded into the card (badge + primary CTA). */
export type CustomerBookingRequestCardAttention = {
    tone: 'info' | 'warning';
    badgeLabel: string;
    actionLabel: string;
    destination: CardPrimaryDestination;
};

function testimonialMissingHint(offers: CustomerBookingRequestCardRequest['offers']): { bookingRequestOfferId: string } | null {
    const offer = offers.find((entry) => entry.testimonialMissing);
    if (!offer) return null;
    return { bookingRequestOfferId: offer.bookingRequestOfferId };
}

function initialsFromDisplay(display: string): string {
    const parts = display.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase();
}

function toOfferChip(offer: CustomerBookingRequestCardOffer): OfferChipModel {
    return {
        cookId: offer.cook.cookId,
        bookingRequestOfferId: offer.bookingRequestOfferId,
        display: offer.cook.user.display,
        profilePictureUrl: offer.cook.user.profilePicture?.url ?? null,
        unreadCount: offer.userUnreadNotificationCount,
    };
}

function uniqueOfferChips(offers: readonly CustomerBookingRequestCardOffer[]): OfferChipModel[] {
    const chipsByCookId = new Map<string, OfferChipModel>();

    for (const offer of offers) {
        const chip = toOfferChip(offer);
        const existing = chipsByCookId.get(chip.cookId);
        if (!existing || (chip.unreadCount > 0 && existing.unreadCount === 0)) {
            chipsByCookId.set(chip.cookId, chip);
        }
    }

    return [...chipsByCookId.values()];
}

function offerTooltipLabel(chip: OfferChipModel, locale: Locale): string {
    const unread =
        chip.unreadCount > 0
            ? {
                  de: ` · ${chip.unreadCount} ungelesen`,
                  en: ` · ${chip.unreadCount} unread`,
              }[locale]
            : '';
    return {
        de: `Angebot von ${chip.display}${unread}`,
        en: `Offer from ${chip.display}${unread}`,
    }[locale];
}

function OfferChip({ chip, bookingRequestId, className }: { chip: OfferChipModel; bookingRequestId: string; className?: string }) {
    const locale = useLocale();
    const tooltipLabel = offerTooltipLabel(chip, locale);

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Link
                    to="/{-$locale}/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId"
                    params={{ bookingRequestId, bookingRequestOfferId: chip.bookingRequestOfferId }}
                    aria-label={tooltipLabel}
                    className={cn(
                        'relative shrink-0 rounded-full ring-2 ring-card hover:opacity-90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                        className,
                    )}
                    onClick={(event) => event.stopPropagation()}
                >
                    <Avatar size="default">
                        {chip.profilePictureUrl != null ? (
                            <AvatarImage src={chip.profilePictureUrl} alt="" className="object-cover" />
                        ) : null}
                        <AvatarFallback>{initialsFromDisplay(chip.display)}</AvatarFallback>
                    </Avatar>
                    {chip.unreadCount > 0 ? (
                        <span aria-hidden className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-accent ring-2 ring-card" />
                    ) : null}
                </Link>
            </TooltipTrigger>
            <TooltipContent>{tooltipLabel}</TooltipContent>
        </Tooltip>
    );
}

function OfferChipStack({ chips, bookingRequestId }: { chips: OfferChipModel[]; bookingRequestId: string }) {
    const locale = useLocale();
    const visibleChips = chips.slice(0, 4);
    const overflowCount = chips.length - visibleChips.length;

    return (
        <div className="flex items-center">
            {visibleChips.map((chip, index) => (
                <OfferChip key={chip.cookId} bookingRequestId={bookingRequestId} chip={chip} className={index > 0 ? '-ml-2' : undefined} />
            ))}
            {overflowCount > 0 ? (
                <Link
                    to="/{-$locale}/profile/booking-requests/$bookingRequestId"
                    params={{ bookingRequestId }}
                    aria-label={
                        {
                            de: `${overflowCount} weitere Angebote anzeigen`,
                            en: `View ${overflowCount} more offers`,
                        }[locale]
                    }
                    className="-ml-2 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground ring-2 ring-card hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    onClick={(event) => event.stopPropagation()}
                >
                    +{overflowCount}
                </Link>
            ) : null}
        </div>
    );
}

const cardClassName = cn(
    'relative flex h-full flex-col justify-between rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm',
    bookingRequestCardInteractionClassName,
);

function cardPrimaryDestination(
    request: CustomerBookingRequestCardRequest,
    callHint: ReturnType<typeof callBookingOverviewHintAcrossOffers>,
    reviewHint: ReturnType<typeof testimonialMissingHint>,
): CardPrimaryDestination {
    if (callHint) {
        return {
            to: '/{-$locale}/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId',
            params: {
                bookingRequestId: request.bookingRequestId,
                bookingRequestOfferId: callHint.bookingRequestOfferId,
            },
            search: callHint.openCall ? { tab: 'call' } : undefined,
        };
    }

    if (reviewHint) {
        return {
            to: '/{-$locale}/profile/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId',
            params: {
                bookingRequestId: request.bookingRequestId,
                bookingRequestOfferId: reviewHint.bookingRequestOfferId,
            },
            search: { tab: 'testimonial' },
        };
    }

    return {
        to: '/{-$locale}/profile/booking-requests/$bookingRequestId',
        params: { bookingRequestId: request.bookingRequestId },
    };
}

export function CustomerBookingRequestCard({
    request,
    attention,
}: {
    request: CustomerBookingRequestCardRequest;
    attention?: CustomerBookingRequestCardAttention;
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const location =
        request.exactEventAddress.city.trim().length > 0 ? request.exactEventAddress.city : request.exactEventAddress.displayText;
    const unreadCount = request.offers.reduce((sum, offer) => sum + offer.userUnreadNotificationCount, 0);
    const callHint = callBookingOverviewHintAcrossOffers(request.offers, locale, timeZone);
    const reviewHint = testimonialMissingHint(request.offers);
    const primary = attention?.destination ?? cardPrimaryDestination(request, callHint, reviewHint);
    const reviewIsPrimaryAction = attention == null && primary.search?.tab === 'testimonial';
    const showReviewBadge = attention == null && reviewHint != null;
    const offerChips = uniqueOfferChips(request.offers);
    const offerLabel = request.offers.length === 1 ? { de: 'Angebot', en: 'Offer' }[locale] : { de: 'Angebote', en: 'Offers' }[locale];
    const ctaLabel =
        attention?.actionLabel ??
        (reviewIsPrimaryAction
            ? { de: 'Bewertung abgeben', en: 'Leave a review' }[locale]
            : { de: 'Zur Anfrage', en: 'View request' }[locale]);

    return (
        <article className={cardClassName}>
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
                <Link to={primary.to} params={primary.params} search={primary.search} className="flex min-w-0 flex-col gap-3 outline-none">
                    <div className={cn('flex items-start gap-2', showReviewBadge || attention != null ? 'justify-between' : 'justify-end')}>
                        {attention != null ? <StatusBadge tone={attention.tone}>{attention.badgeLabel}</StatusBadge> : null}
                        {showReviewBadge ? <StatusBadge tone="warning">{{ de: 'Bewertung', en: 'Review' }[locale]}</StatusBadge> : null}
                        <BookingStatusPill hue={bookingRequestStatusHue(request.status)} className="w-fit shrink-0">
                            {bookingRequestStatusLabel(request.status, locale, 'customer')}
                        </BookingStatusPill>
                    </div>
                    <h2 className="line-clamp-1 pr-8 font-semibold leading-snug">{request.occasion}</h2>
                    <p className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                        <CalendarIcon className="size-4 shrink-0 text-muted-foreground/70" aria-hidden />
                        <span className="truncate">{formatDate(request.dateTime, { locale, timeZone, dateStyle: 'full' })}</span>
                    </p>
                    <p className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                        <UsersIcon className="size-4 shrink-0 text-muted-foreground/70" aria-hidden />
                        <span className="truncate">{formatParticipants(request.participants, { locale })}</span>
                    </p>
                    <p className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                        <MapPinIcon className="size-4 shrink-0 text-muted-foreground/70" aria-hidden />
                        <span className="truncate">{location}</span>
                    </p>
                </Link>
                {offerChips.length > 0 ? (
                    <div className="flex h-10 items-center justify-between gap-3">
                        <span className="text-sm font-medium whitespace-nowrap text-foreground">{offerLabel}</span>
                        <OfferChipStack bookingRequestId={request.bookingRequestId} chips={offerChips} />
                    </div>
                ) : null}
                {attention == null && callHint ? <p className="text-sm font-medium text-foreground">{callHint.label}</p> : null}
            </div>
            <Link
                to={primary.to}
                params={primary.params}
                search={primary.search}
                className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
                {ctaLabel}
            </Link>
        </article>
    );
}
