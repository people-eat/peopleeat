import { Link } from '@tanstack/react-router';
import { CalendarIcon, InfoIcon, MapPinIcon, UserIcon, UsersIcon } from 'lucide-react';

import { formatCurrency, formatDate, formatParticipants } from '../../shared';
import type { BookingRequestOfferStatus } from '../../shared/bookingRequestOfferStatus';
import { bookingRequestOfferStatusHue, bookingRequestOfferStatusLabel } from '../../shared/bookingRequestOfferStatus';
import { useLocale } from '../hooks/useLocale';
import { useTimeZone } from '../hooks/useTimeZone';
import { cn } from '../utils/cn';
import { NotificationBadge } from './base/notification-badge';
import { Popover, PopoverContent, PopoverTrigger } from './base/popover';
import { bookingRequestCardInteractionClassName } from './bookingRequestCardInteraction';
import { BookingStatusPill } from './BookingStatusPill';
import type { CallBookingOverviewItem } from './callBookingOverviewHint';
import { callBookingOverviewHint } from './callBookingOverviewHint';

export type CookBookingRequestOfferCardOffer = {
    bookingRequestOfferId: string;
    status: BookingRequestOfferStatus;
    cookAccepted?: boolean | null;
    userAccepted?: boolean | null;
    cookUnreadNotificationCount: number;
    totalWithoutDiscountsCentsCustomer: number;
    payoutCentsCook: number;
    callBookings?: readonly CallBookingOverviewItem[];
    bookingRequest: {
        occasion: string;
        dateTime: string;
        exactEventAddress: {
            displayText: string;
            city: string;
        };
        participants: { type: 'ADULT' | 'DISCOUNTED' | string }[];
        user: { display: string };
    };
};

export function CookBookingRequestOfferCard({ offer }: { offer: CookBookingRequestOfferCardOffer }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const request = offer.bookingRequest;
    const location =
        request.exactEventAddress.city.trim().length > 0 ? request.exactEventAddress.city : request.exactEventAddress.displayText;
    const callHint = callBookingOverviewHint(offer.callBookings, 'cook', locale, timeZone);
    const mutuallyAccepted = offer.cookAccepted && offer.userAccepted;
    const amountCents = mutuallyAccepted ? offer.payoutCentsCook : offer.totalWithoutDiscountsCentsCustomer;
    const amountLabel = mutuallyAccepted
        ? { de: 'Auszahlungsbetrag', en: 'Payout amount' }[locale]
        : { de: 'Auftragswert', en: 'Order value' }[locale];

    return (
        <Link
            to="/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId"
            params={{ bookingRequestOfferId: offer.bookingRequestOfferId }}
            search={callHint?.openCall ? { tab: 'call' } : undefined}
            className={cn(
                'relative flex h-full flex-col justify-between rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm',
                bookingRequestCardInteractionClassName,
            )}
        >
            <NotificationBadge
                count={offer.cookUnreadNotificationCount}
                label={
                    {
                        de: `${offer.cookUnreadNotificationCount} ungelesene Benachrichtigungen`,
                        en: `${offer.cookUnreadNotificationCount} unread notifications`,
                    }[locale]
                }
            />
            {callHint ? (
                <div
                    className="absolute top-3 left-3 z-10"
                    onClick={(event) => event.stopPropagation()}
                    onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                    }}
                >
                    <Popover>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                className="inline-flex cursor-pointer rounded-full text-muted-foreground hover:text-foreground"
                                aria-label={
                                    {
                                        de: 'Hinweis zum Gesprächstermin',
                                        en: 'Discovery call note',
                                    }[locale]
                                }
                            >
                                <InfoIcon className="size-4" />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-64 p-3 text-sm">
                            <p>{callHint.label}</p>
                        </PopoverContent>
                    </Popover>
                </div>
            ) : null}
            <div className="flex min-w-0 flex-col gap-3">
                <BookingStatusPill hue={bookingRequestOfferStatusHue(offer.status)} className="w-fit self-end">
                    {bookingRequestOfferStatusLabel(offer.status, locale, 'cook')}
                </BookingStatusPill>
                <h2 className="line-clamp-1 pr-8 font-semibold leading-snug">{request.occasion}</h2>
                <p className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                    <UserIcon className="size-4 shrink-0 text-muted-foreground/70" aria-hidden />
                    <span className="truncate">{request.user.display}</span>
                </p>
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
                <p className="flex items-center justify-between gap-3 text-sm font-semibold">
                    <span>{amountLabel}</span>
                    <span className="shrink-0">{formatCurrency(amountCents, { locale })}</span>
                </p>
            </div>
            <span className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
                {{ de: 'Zum Angebot', en: 'View offer' }[locale]}
            </span>
        </Link>
    );
}
