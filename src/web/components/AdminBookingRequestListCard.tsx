import { Link } from '@tanstack/react-router';
import { CalendarIcon, MapPinIcon, UserIcon, UsersIcon } from 'lucide-react';

import { formatDate, formatDateTime, formatParticipants, userDisplayName } from '../../shared';
import type { Locale } from '../../shared/locale';
import type { GqlCBookingRequestPublicationStatus, GqlCBookingRequestStatus } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { useTimeZone } from '../hooks/useTimeZone';
import { adminBookingRequestPublicationStatusLabel } from '../pages/admin/adminBookingRequestsColumns';
import { cn } from '../utils/cn';
import { adminBookingRequestOfferStatusLabel } from './adminBookingRequestOfferStatus';
import { Avatar, AvatarFallback } from './base/avatar';
import { Badge } from './base/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from './base/tooltip';
import { bookingRequestCardInteractionClassName } from './bookingRequestCardInteraction';
import { adminBookingRequestStatusLabel, bookingRequestStatusClassName } from './bookingRequestStatus';
import { BookingStatusPill } from './BookingStatusPill';

const ACCEPTED_PATH_OFFER_STATUSES = new Set(['USER_NEEDS_DEPOSIT_PAYMENT', 'PAYMENT_PULL_PENDING', 'EVENT_PENDING', 'COMPLETED']);

const INACTIVE_OFFER_STATUSES = new Set(['USER_DECLINED', 'COOK_DECLINED', 'USER_CHOOSE_DIFFERENT_OFFER', 'EXPIRED', 'CANCELED']);

const BOOKING_REQUEST_ACCEPTED_OR_LATER = new Set(['DEPOSIT_PAYMENT_PENDING', 'PAYMENT_PULL_PENDING', 'EVENT_PENDING', 'COMPLETED']);

type AdminBookingRequestListCardOffer = {
    bookingRequestOfferId: string;
    status: string;
    createdAt: string;
    userUnreadNotificationCount: number;
    cookUnreadNotificationCount: number;
    cook: {
        cookId: string;
        user: { userId: string; firstName: string; lastName: string };
    };
};

export type AdminBookingRequestListCardRequest = {
    bookingRequestId: string;
    status: GqlCBookingRequestStatus;
    publicationStatus: GqlCBookingRequestPublicationStatus;
    occasion: string;
    dateTime: string;
    createdAt: string;
    exactEventAddress: { city: string; displayText: string };
    participants: { type: string }[];
    customer: { userId: string; firstName: string; lastName: string; emailAddress: string | null };
    offers: AdminBookingRequestListCardOffer[];
};

type OfferChipModel = {
    cookId: string;
    bookingRequestOfferId: string;
    firstName: string;
    lastName: string;
    createdAt: string;
    status: string;
    unreadCount: number;
};

function isAcceptedPathOfferStatus(status: string): boolean {
    return ACCEPTED_PATH_OFFER_STATUSES.has(status);
}

function isInactiveOfferStatus(status: string): boolean {
    return INACTIVE_OFFER_STATUSES.has(status);
}

function initialsFromName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`.toUpperCase();
}

function formatOfferCreatedAt(value: string, locale: Locale, timeZone: string): string {
    return formatDateTime(value, { locale, timeZone, dateStyle: 'medium', timeStyle: 'short' });
}

function toOfferChip(offer: AdminBookingRequestListCardOffer): OfferChipModel {
    return {
        cookId: offer.cook.cookId,
        bookingRequestOfferId: offer.bookingRequestOfferId,
        firstName: offer.cook.user.firstName,
        lastName: offer.cook.user.lastName,
        createdAt: offer.createdAt,
        status: offer.status,
        unreadCount: offer.userUnreadNotificationCount + offer.cookUnreadNotificationCount,
    };
}

function uniqueOfferChips(offers: readonly AdminBookingRequestListCardOffer[]): OfferChipModel[] {
    const chipsByCookId = new Map<string, OfferChipModel>();

    for (const offer of offers) {
        const chip = toOfferChip(offer);
        const existing = chipsByCookId.get(chip.cookId);
        if (!existing || (isAcceptedPathOfferStatus(chip.status) && !isAcceptedPathOfferStatus(existing.status))) {
            chipsByCookId.set(chip.cookId, chip);
        }
    }

    return [...chipsByCookId.values()];
}

function offerTooltipLabel(chip: OfferChipModel, locale: Locale, timeZone: string): string {
    const createdAtLabel = formatOfferCreatedAt(chip.createdAt, locale, timeZone);
    const statusTitle = adminBookingRequestOfferStatusLabel(chip.status, locale);
    const name = userDisplayName({ firstName: chip.firstName, lastName: chip.lastName });
    const unread =
        chip.unreadCount > 0
            ? {
                  de: ` · ${chip.unreadCount} ungelesen`,
                  en: ` · ${chip.unreadCount} unread`,
              }[locale]
            : '';
    return {
        de: `Angebot von ${name} · ${statusTitle} · ${createdAtLabel}${unread}`,
        en: `Offer from ${name} · ${statusTitle} · ${createdAtLabel}${unread}`,
    }[locale];
}

function OfferChip({
    chip,
    bookingRequestId,
    muted,
    emphasized,
    className,
}: {
    chip: OfferChipModel;
    bookingRequestId: string;
    muted?: boolean;
    emphasized?: boolean;
    className?: string;
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const tooltipLabel = offerTooltipLabel(chip, locale, timeZone);
    const name = userDisplayName({ firstName: chip.firstName, lastName: chip.lastName });

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Link
                    to="/{-$locale}/admin/booking-requests/$bookingRequestId/offers/$bookingRequestOfferId"
                    params={{ bookingRequestId, bookingRequestOfferId: chip.bookingRequestOfferId }}
                    aria-label={tooltipLabel}
                    className={cn(
                        'relative shrink-0 rounded-full ring-2 ring-card focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                        muted ? 'opacity-40 grayscale' : 'hover:opacity-90',
                        emphasized && 'ring-success',
                        className,
                    )}
                    onClick={(event) => event.stopPropagation()}
                >
                    <Avatar size="default">
                        <AvatarFallback>{initialsFromName(name)}</AvatarFallback>
                    </Avatar>
                    {chip.unreadCount > 0 && !muted ? (
                        <span aria-hidden className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-accent ring-2 ring-card" />
                    ) : null}
                </Link>
            </TooltipTrigger>
            <TooltipContent>{tooltipLabel}</TooltipContent>
        </Tooltip>
    );
}

function OfferChipStack({
    chips,
    bookingRequestId,
    muted,
    overflowHrefBookingRequestId,
}: {
    chips: OfferChipModel[];
    bookingRequestId: string;
    muted?: boolean;
    overflowHrefBookingRequestId: string;
}) {
    const locale = useLocale();
    const visibleChips = chips.slice(0, 4);
    const overflowCount = chips.length - visibleChips.length;

    return (
        <div className="flex items-center">
            {visibleChips.map((chip, index) => (
                <OfferChip
                    key={chip.cookId}
                    bookingRequestId={bookingRequestId}
                    chip={chip}
                    className={index > 0 ? '-ml-2' : undefined}
                    muted={muted}
                />
            ))}
            {overflowCount > 0 ? (
                <Link
                    to="/{-$locale}/admin/booking-requests/$bookingRequestId"
                    params={{ bookingRequestId: overflowHrefBookingRequestId }}
                    search={{ tab: 'offers' }}
                    aria-label={
                        {
                            de: `${overflowCount} weitere Angebote anzeigen`,
                            en: `View ${overflowCount} more offers`,
                        }[locale]
                    }
                    className={cn(
                        '-ml-2 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground ring-2 ring-card hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                        muted && 'opacity-40 grayscale',
                    )}
                    onClick={(event) => event.stopPropagation()}
                >
                    +{overflowCount}
                </Link>
            ) : null}
        </div>
    );
}

function OffersFooter({
    bookingRequestId,
    bookingRequestStatus,
    offers,
}: {
    bookingRequestId: string;
    bookingRequestStatus: string;
    offers: readonly AdminBookingRequestListCardOffer[];
}) {
    const locale = useLocale();
    const chips = uniqueOfferChips(offers);
    const bookingRequestInactive = bookingRequestStatus === 'CANCELED' || bookingRequestStatus === 'EXPIRED';
    const acceptedChip = chips.find((chip) => isAcceptedPathOfferStatus(chip.status));
    const inactiveChips = chips.filter((chip) => isInactiveOfferStatus(chip.status));
    const hasAcceptedOutcome = BOOKING_REQUEST_ACCEPTED_OR_LATER.has(bookingRequestStatus) || acceptedChip !== undefined;
    const useAcceptedLayout = hasAcceptedOutcome && acceptedChip !== undefined;
    const allMuted = bookingRequestInactive;
    const offerCount = offers.length;

    let offerLabel: string;
    if (useAcceptedLayout) {
        offerLabel = acceptedChip.firstName;
    } else if (offerCount === 1) {
        offerLabel = { de: '1 Angebot', en: '1 offer' }[locale];
    } else {
        offerLabel = { de: `${offerCount} Angebote`, en: `${offerCount} offers` }[locale];
    }

    const offersLinkClassName = cn(
        'text-sm font-medium whitespace-nowrap hover:underline',
        allMuted ? 'text-muted-foreground' : 'text-foreground',
    );

    if (chips.length === 0) {
        return (
            <div className="flex h-10 items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">{{ de: 'Keine Angebote', en: 'No offers' }[locale]}</span>
                <Link
                    to="/{-$locale}/admin/booking-requests/$bookingRequestId"
                    params={{ bookingRequestId }}
                    search={{ tab: 'offers' }}
                    className={offersLinkClassName}
                    onClick={(event) => event.stopPropagation()}
                >
                    {{ de: 'Angebote', en: 'Offers' }[locale]}
                </Link>
            </div>
        );
    }

    if (useAcceptedLayout) {
        return (
            <div className="flex h-10 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <OfferChip bookingRequestId={bookingRequestId} chip={acceptedChip} emphasized={!allMuted} muted={allMuted} />
                    {inactiveChips.length > 0 ? (
                        <OfferChipStack
                            bookingRequestId={bookingRequestId}
                            chips={inactiveChips}
                            muted
                            overflowHrefBookingRequestId={bookingRequestId}
                        />
                    ) : null}
                </div>
                <Link
                    to="/{-$locale}/admin/booking-requests/$bookingRequestId"
                    params={{ bookingRequestId }}
                    search={{ tab: 'offers' }}
                    className={offersLinkClassName}
                    onClick={(event) => event.stopPropagation()}
                >
                    {offerLabel}
                </Link>
            </div>
        );
    }

    return (
        <div className="flex h-10 items-center justify-between gap-3">
            <OfferChipStack
                bookingRequestId={bookingRequestId}
                chips={chips}
                muted={allMuted}
                overflowHrefBookingRequestId={bookingRequestId}
            />
            <Link
                to="/{-$locale}/admin/booking-requests/$bookingRequestId"
                params={{ bookingRequestId }}
                search={{ tab: 'offers' }}
                className={offersLinkClassName}
                onClick={(event) => event.stopPropagation()}
            >
                {offerLabel}
            </Link>
        </div>
    );
}

export function AdminBookingRequestListCard({ request }: { request: AdminBookingRequestListCardRequest }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const customerName = userDisplayName(request.customer);
    const location =
        request.exactEventAddress.city.trim().length > 0 ? request.exactEventAddress.city : request.exactEventAddress.displayText;
    const needsPublicationReview = request.publicationStatus === 'PUBLICATION_BLOCKED_BY_ADMIN_REVIEW';

    return (
        <article
            className={cn(
                'flex h-full flex-col gap-4 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm',
                bookingRequestCardInteractionClassName,
            )}
        >
            <div className="flex min-h-0 flex-1 flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                    <Link
                        to="/{-$locale}/admin/booking-requests/$bookingRequestId"
                        params={{ bookingRequestId: request.bookingRequestId }}
                        className="min-w-0 flex-1 line-clamp-1 font-semibold leading-snug hover:underline"
                    >
                        {request.occasion}
                    </Link>
                    <div className="grid w-max shrink-0 justify-items-end gap-1">
                        <BookingStatusPill className={bookingRequestStatusClassName(request.status)}>
                            {adminBookingRequestStatusLabel(request.status, locale)}
                        </BookingStatusPill>
                        {needsPublicationReview ? (
                            <Badge variant="outline">{adminBookingRequestPublicationStatusLabel(request.publicationStatus, locale)}</Badge>
                        ) : null}
                    </div>
                </div>

                <div className="flex min-w-0 flex-col gap-2">
                    <p className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                        <UserIcon className="size-4 shrink-0 text-muted-foreground/70" aria-hidden />
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Link
                                    to="/{-$locale}/admin/users/$userId"
                                    params={{ userId: request.customer.userId }}
                                    className="truncate hover:underline"
                                >
                                    {customerName}
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent>{{ de: 'Zum Benutzerprofil', en: 'To user profile' }[locale]}</TooltipContent>
                        </Tooltip>
                    </p>
                    <Link
                        to="/{-$locale}/admin/booking-requests/$bookingRequestId"
                        params={{ bookingRequestId: request.bookingRequestId }}
                        className="flex min-w-0 flex-col gap-2"
                    >
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
                        <p className="truncate text-xs text-muted-foreground/80">
                            {{ de: 'Erstellt', en: 'Created' }[locale]}{' '}
                            {formatDate(request.createdAt, { locale, timeZone, dateStyle: 'medium' })}
                        </p>
                    </Link>
                </div>
            </div>

            <div className="border-t border-border pt-3">
                <OffersFooter bookingRequestId={request.bookingRequestId} bookingRequestStatus={request.status} offers={request.offers} />
            </div>
        </article>
    );
}
