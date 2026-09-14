import { Link } from '@tanstack/react-router';

import { cookStubRouteBySlug } from '../pages/profile/cookCatalog';
import type { Locale } from '../utils/locale';
import { Button } from './base/button';
import { StatusAlert } from './base/status-alert';

export type CookBookingRequestPoolUnavailableKind =
    'CookBookingRequestCanceled' | 'CookBookingRequestTaken' | 'CookBookingRequestExpired' | 'CookBookingRequestOfferAlreadyExists';

const COPY: Record<CookBookingRequestPoolUnavailableKind, { title: Record<Locale, string>; body: Record<Locale, string> }> = {
    CookBookingRequestCanceled: {
        title: {
            de: 'Anfrage zurückgezogen',
            en: 'Request withdrawn',
        },
        body: {
            de: 'Der Gast hat diese Buchungsanfrage zurückgezogen. Sie ist nicht mehr verfügbar.',
            en: 'The guest withdrew this booking request. It is no longer available.',
        },
    },
    CookBookingRequestTaken: {
        title: {
            de: 'Ein anderer Koch wurde gewählt',
            en: 'Another chef was chosen',
        },
        body: {
            de: 'Für dieses Event wurde ein anderer Privatkoch gewählt. Die Anfrage ist daher nicht mehr verfügbar.',
            en: 'Another private chef was chosen for this event. This request is no longer available.',
        },
    },
    CookBookingRequestExpired: {
        title: {
            de: 'Anfrage abgelaufen',
            en: 'Request expired',
        },
        body: {
            de: 'Diese Buchungsanfrage ist abgelaufen und nicht mehr verfügbar.',
            en: 'This booking request has expired and is no longer available.',
        },
    },
    CookBookingRequestOfferAlreadyExists: {
        title: {
            de: 'Du hast bereits ein Angebot erstellt',
            en: 'You already created an offer',
        },
        body: {
            de: 'Für diese Anfrage hast du bereits ein Angebot. Öffne es in deinem Angebots-Posteingang.',
            en: 'You already have an offer for this request. Open it in your offer inbox.',
        },
    },
};

const poolRoute = cookStubRouteBySlug('booking-request-pool');
const offersRoute = cookStubRouteBySlug('booking-request-offers');

export function CookBookingRequestPoolUnavailable({
    kind,
    locale,
    bookingRequestOfferId,
}: {
    kind: CookBookingRequestPoolUnavailableKind;
    locale: Locale;
    bookingRequestOfferId?: string;
}) {
    const copy = COPY[kind];
    const offerLink =
        kind === 'CookBookingRequestOfferAlreadyExists' && bookingRequestOfferId != null
            ? ({
                  to: '/{-$locale}/profile/booking-request-offers/$bookingRequestOfferId' as const,
                  params: { bookingRequestOfferId },
              } as const)
            : null;

    return (
        <div className="grid content-start gap-6">
            <StatusAlert
                tone="info"
                title={copy.title[locale]}
                action={
                    offerLink != null ? (
                        <Button asChild variant="outline" size="sm">
                            <Link {...offerLink}>{{ de: 'Zum Angebot', en: 'Go to offer' }[locale]}</Link>
                        </Button>
                    ) : (
                        <Button asChild variant="outline" size="sm">
                            <Link to={poolRoute.to}>{{ de: 'Zum Anfragen-Pool', en: 'Back to request pool' }[locale]}</Link>
                        </Button>
                    )
                }
            >
                {copy.body[locale]}
            </StatusAlert>
            {offerLink == null ? (
                <Button asChild>
                    <Link to={poolRoute.to}>{{ de: 'Offene Anfragen ansehen', en: 'View open requests' }[locale]}</Link>
                </Button>
            ) : (
                <div className="flex flex-wrap gap-3">
                    <Button asChild>
                        <Link {...offerLink}>{{ de: 'Angebot öffnen', en: 'Open offer' }[locale]}</Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link to={offersRoute.to}>{{ de: 'Alle Angebote', en: 'All offers' }[locale]}</Link>
                    </Button>
                </div>
            )}
        </div>
    );
}
