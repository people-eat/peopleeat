import { Link } from '@tanstack/react-router';

import { t } from '../../i18n/t';
import type { Locale } from '../../shared';
import { cookStubRouteBySlug } from '../pages/profile/cookCatalog';
import { Button } from './base/button';
import { StatusAlert } from './base/status-alert';

export type CookBookingRequestPoolUnavailableKind =
    'CookBookingRequestCanceled' | 'CookBookingRequestTaken' | 'CookBookingRequestExpired' | 'CookBookingRequestOfferAlreadyExists';

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
                title={t(locale, 'profileCook', `poolUnavailable.${kind}.title`)}
                action={
                    offerLink != null ? (
                        <Button asChild variant="outline" size="sm">
                            <Link {...offerLink}>{t(locale, 'profileCook', 'offerCreate.goToOffer')}</Link>
                        </Button>
                    ) : (
                        <Button asChild variant="outline" size="sm">
                            <Link to={poolRoute.to}>{t(locale, 'profileCook', 'poolUnavailable.backToPool')}</Link>
                        </Button>
                    )
                }
            >
                {t(locale, 'profileCook', `poolUnavailable.${kind}.body`)}
            </StatusAlert>
            {offerLink == null ? (
                <Button asChild>
                    <Link to={poolRoute.to}>{t(locale, 'profileCook', 'poolUnavailable.viewOpenRequests')}</Link>
                </Button>
            ) : (
                <div className="flex flex-wrap gap-3">
                    <Button asChild>
                        <Link {...offerLink}>{t(locale, 'profileCook', 'menus.openOffer')}</Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link to={offersRoute.to}>{t(locale, 'profileCook', 'poolUnavailable.allOffers')}</Link>
                    </Button>
                </div>
            )}
        </div>
    );
}
