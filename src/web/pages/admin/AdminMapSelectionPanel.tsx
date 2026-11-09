import { Link } from '@tanstack/react-router';
import { XIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useQuery } from 'urql';

import { bookingRequestStatusLabel } from '../../../shared/bookingRequestStatus';
import { Button } from '../../components/base/button';
import type {
    GqlCAdminMapBookingRequestPoint,
    GqlCAdminMapCityPoint,
    GqlCAdminMapCookPoint,
    GqlCAdminMapPartnerVenuePoint,
} from '../../graphql/generated';
import { AdminMapCoverageDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import type { AdminMapCoverageCook } from './AdminMapCanvas';
import type { AdminMapFocus } from './adminMapSearch';

type AdminMapSelectionPanelProps = {
    focus: AdminMapFocus;
    cooks: readonly GqlCAdminMapCookPoint[];
    bookingRequests: readonly GqlCAdminMapBookingRequestPoint[];
    cities: readonly GqlCAdminMapCityPoint[];
    partnerVenues: readonly GqlCAdminMapPartnerVenuePoint[];
    onCoverageCooksChange: (cooks: readonly AdminMapCoverageCook[]) => void;
    onClose: () => void;
};

export function AdminMapSelectionPanel({
    focus,
    cooks,
    bookingRequests,
    cities,
    partnerVenues,
    onCoverageCooksChange,
    onClose,
}: AdminMapSelectionPanelProps) {
    const locale = useLocale();

    const cook = focus.kind === 'cook' ? cooks.find((row) => row.cookId === focus.id) : undefined;
    const booking = focus.kind === 'booking' ? bookingRequests.find((row) => row.bookingRequestId === focus.id) : undefined;
    const city = focus.kind === 'city' ? cities.find((row) => row.cityId === focus.id) : undefined;
    const venue = focus.kind === 'venue' ? partnerVenues.find((row) => row.partnerVenueId === focus.id) : undefined;

    const coveragePoint =
        focus.kind === 'booking' && booking
            ? { latitude: booking.latitude, longitude: booking.longitude }
            : focus.kind === 'city' && city
              ? { latitude: city.latitude, longitude: city.longitude }
              : null;

    const [{ data: coverageData, fetching: coverageFetching }] = useQuery({
        query: AdminMapCoverageDocument,
        variables: coveragePoint ? { latitude: coveragePoint.latitude, longitude: coveragePoint.longitude } : { latitude: 0, longitude: 0 },
        pause: coveragePoint == null,
    });

    const coverageRows = coverageData?.currentSession.user?.admin?.cooksInTravelRadius ?? [];
    const coverageKey = coverageRows.map((row) => `${row.cook.cookId}:${row.cook.maximumTravelDistance ?? ''}`).join('|');

    useEffect(() => {
        if (focus.kind !== 'booking' && focus.kind !== 'city') {
            onCoverageCooksChange([]);
            return;
        }
        const next: AdminMapCoverageCook[] = [];
        for (const row of coverageRows) {
            const address = row.cook.exactTravelOriginAddress;
            if (!address) continue;
            next.push({
                cookId: row.cook.cookId,
                latitude: address.latitude,
                longitude: address.longitude,
                maximumTravelDistance: row.cook.maximumTravelDistance,
            });
            if (next.length >= 25) break;
        }
        onCoverageCooksChange(next);
    }, [focus.kind, focus.id, coverageKey, coverageRows, onCoverageCooksChange]);

    useEffect(() => {
        return () => onCoverageCooksChange([]);
    }, [onCoverageCooksChange]);

    const title =
        focus.kind === 'cook'
            ? (cook?.displayName ?? focus.id)
            : focus.kind === 'booking'
              ? (booking?.occasion ?? focus.id)
              : focus.kind === 'city'
                ? city
                    ? locale === 'de'
                        ? city.nameDe
                        : city.nameEn
                    : focus.id
                : (venue?.name ?? focus.id);

    const kindLabel = {
        cook: { de: 'Koch', en: 'Cook' },
        booking: { de: 'Buchungsanfrage', en: 'Booking request' },
        city: { de: 'Stadt', en: 'City' },
        venue: { de: 'Location', en: 'Venue' },
    }[focus.kind][locale];

    return (
        <aside className="pointer-events-auto flex max-h-[min(70vh,28rem)] w-full flex-col overflow-hidden rounded-lg border bg-background/95 shadow-md backdrop-blur-sm">
            <div className="flex items-start gap-2 border-b px-3 py-2">
                <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">{kindLabel}</p>
                    <h2 className="truncate text-sm font-medium text-foreground">{title}</h2>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={onClose}
                    aria-label={{ de: 'Auswahl schließen', en: 'Clear selection' }[locale]}
                >
                    <XIcon />
                </Button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-sm">
                {focus.kind === 'cook' && cook ? (
                    <>
                        <p>
                            {{ de: 'Status', en: 'Status' }[locale]}:{' '}
                            {
                                {
                                    LISTABLE: { de: 'Öffentlich sichtbar', en: 'Listable' },
                                    PENDING: { de: 'Ausstehend', en: 'Pending' },
                                    HIDDEN: { de: 'Verborgen', en: 'Hidden' },
                                }[cook.mapStatus][locale]
                            }
                        </p>
                        <p>
                            {{ de: 'Radius', en: 'Radius' }[locale]}:{' '}
                            {cook.maximumTravelDistance == null
                                ? { de: 'Unbegrenzt', en: 'Unlimited' }[locale]
                                : `${cook.maximumTravelDistance} km`}
                        </p>
                        <Button type="button" variant="outline" size="sm" asChild>
                            <Link to="/{-$locale}/admin/users/$userId" params={{ userId: cook.cookId }} search={{ tab: 'cook-profile' }}>
                                {{ de: 'Kochprofil öffnen', en: 'Open cook profile' }[locale]}
                            </Link>
                        </Button>
                    </>
                ) : null}

                {focus.kind === 'booking' && booking ? (
                    <>
                        <p>
                            {{ de: 'Status', en: 'Status' }[locale]}: {bookingRequestStatusLabel(booking.status, locale, 'admin')}
                        </p>
                        <p>
                            {{ de: 'Veröffentlichung', en: 'Publication' }[locale]}: {booking.publicationStatus}
                        </p>
                        <Button type="button" variant="outline" size="sm" asChild>
                            <Link
                                to="/{-$locale}/admin/booking-requests/$bookingRequestId"
                                params={{ bookingRequestId: booking.bookingRequestId }}
                            >
                                {{ de: 'Anfrage öffnen', en: 'Open request' }[locale]}
                            </Link>
                        </Button>
                    </>
                ) : null}

                {focus.kind === 'city' && city ? (
                    <>
                        <p>
                            {{ de: 'Veröffentlicht', en: 'Published' }[locale]}:{' '}
                            {city.published ? { de: 'Ja', en: 'Yes' }[locale] : { de: 'Nein', en: 'No' }[locale]}
                        </p>
                        <Button type="button" variant="outline" size="sm" asChild>
                            <Link to="/{-$locale}/admin/cities/$cityId" params={{ cityId: city.cityId }}>
                                {{ de: 'Stadt öffnen', en: 'Open city' }[locale]}
                            </Link>
                        </Button>
                    </>
                ) : null}

                {focus.kind === 'venue' && venue ? (
                    <>
                        <p>
                            {{ de: 'Veröffentlicht', en: 'Published' }[locale]}:{' '}
                            {venue.published ? { de: 'Ja', en: 'Yes' }[locale] : { de: 'Nein', en: 'No' }[locale]}
                        </p>
                        {venue.partnerName ? <p className="text-muted-foreground">{venue.partnerName}</p> : null}
                        <Button type="button" variant="outline" size="sm" asChild>
                            <Link to="/{-$locale}/admin/partner-venues/$partnerVenueId" params={{ partnerVenueId: venue.partnerVenueId }}>
                                {{ de: 'Location öffnen', en: 'Open venue' }[locale]}
                            </Link>
                        </Button>
                    </>
                ) : null}

                {focus.kind === 'booking' || focus.kind === 'city' ? (
                    <div className="space-y-2 border-t pt-3">
                        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            {{ de: 'Köche im Radius', en: 'Cooks in radius' }[locale]}
                        </h3>
                        {coverageFetching ? (
                            <p className="text-muted-foreground">{{ de: 'Laden…', en: 'Loading…' }[locale]}</p>
                        ) : coverageRows.length === 0 ? (
                            <p className="text-muted-foreground">
                                {{ de: 'Keine Köche mit Angebotsrecht.', en: 'No offer-capable cooks.' }[locale]}
                            </p>
                        ) : (
                            <ul className="space-y-1.5">
                                {coverageRows.slice(0, 25).map((row) => {
                                    const name = row.cook.stageName?.trim() || row.cook.user.firstName;
                                    return (
                                        <li key={row.cook.cookId} className="flex items-baseline justify-between gap-2">
                                            <Link
                                                to="/{-$locale}/admin/users/$userId"
                                                params={{ userId: row.cook.cookId }}
                                                search={{ tab: 'cook-profile' }}
                                                className="truncate text-foreground underline-offset-2 hover:underline"
                                            >
                                                {name}
                                            </Link>
                                            <span className="shrink-0 text-xs text-muted-foreground">
                                                {Math.round(row.estimatedTravelDistanceKm)} km
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                ) : null}

                {!cook && !booking && !city && !venue ? (
                    <p className="text-muted-foreground">
                        {{ de: 'Punkt nicht in den geladenen Ebenen.', en: 'Point not in the loaded layers.' }[locale]}
                    </p>
                ) : null}
            </div>
        </aside>
    );
}
