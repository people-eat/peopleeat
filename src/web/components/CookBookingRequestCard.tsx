import { Link } from '@tanstack/react-router';
import { CalendarIcon, MapPinIcon, UsersIcon } from 'lucide-react';

import { formatCurrency, formatDate, formatParticipants } from '../../shared';
import { useLocale } from '../hooks/useLocale';
import { useTimeZone } from '../hooks/useTimeZone';
import { cn } from '../utils/cn';
import { bookingRequestCardInteractionClassName } from './bookingRequestCardInteraction';
import { BookingStatusPill } from './BookingStatusPill';

export type CookBookingRequestCardRequest = {
    bookingRequestId: string;
    occasion: string;
    dateTime: string;
    estimatedCookPayoutCents: number;
    exactEventAddress: {
        displayText: string;
        city: string;
    };
    participants: { type: 'ADULT' | 'DISCOUNTED' | string }[];
    cookPoolDetails?: {
        declinedAt?: string | null;
        declinationReason?: string | null;
    } | null;
};

export function CookBookingRequestCard({ request, variant }: { request: CookBookingRequestCardRequest; variant: 'open' | 'declined' }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const isDeclined = variant === 'declined';
    const location =
        request.exactEventAddress.city.trim().length > 0 ? request.exactEventAddress.city : request.exactEventAddress.displayText;

    const content = (
        <>
            <div className="flex flex-col gap-3">
                <BookingStatusPill className={cn('w-fit self-end', isDeclined ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}>
                    {isDeclined ? { de: 'Ausgeblendet', en: 'Hidden' }[locale] : { de: 'Neue Anfrage', en: 'New request' }[locale]}
                </BookingStatusPill>
                <h2 className="line-clamp-1 font-semibold leading-snug">{request.occasion}</h2>
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
                {isDeclined && request.cookPoolDetails?.declinedAt ? (
                    <p className="truncate text-sm font-medium">
                        {{ de: 'Abgelehnt am', en: 'Declined at' }[locale]}{' '}
                        {formatDate(request.cookPoolDetails.declinedAt, { locale, timeZone, dateStyle: 'medium' })}
                    </p>
                ) : null}
                {isDeclined && request.cookPoolDetails?.declinationReason ? (
                    <p className="wrap-break-word text-sm text-muted-foreground">{request.cookPoolDetails.declinationReason}</p>
                ) : null}
                {!isDeclined ? (
                    <p className="flex items-center justify-between gap-3 text-sm font-semibold">
                        <span>{{ de: 'Verdiene ca.', en: 'Make about' }[locale]}</span>
                        <span className="shrink-0">{formatCurrency(request.estimatedCookPayoutCents, { locale })}</span>
                    </p>
                ) : null}
            </div>
            {!isDeclined ? (
                <span className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
                    {{ de: 'Angebot erstellen', en: 'Make an offer' }[locale]}
                </span>
            ) : null}
        </>
    );

    const className = cn(
        'flex h-full flex-col justify-between rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm',
        !isDeclined && bookingRequestCardInteractionClassName,
    );

    if (!isDeclined) {
        return (
            <Link
                to="/{-$locale}/profile/booking-request-pool/$bookingRequestId"
                params={{ bookingRequestId: request.bookingRequestId }}
                className={className}
            >
                {content}
            </Link>
        );
    }

    return <div className={className}>{content}</div>;
}
