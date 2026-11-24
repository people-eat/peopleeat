import { Link, useNavigate } from '@tanstack/react-router';

import { t } from '../../../i18n/t';
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { StatusAlert } from '../../components/base/status-alert';
import { Tabs, TabsList, TabsTrigger } from '../../components/base/tabs';
import { CookBookingRequestOfferCard } from '../../components/CookBookingRequestOfferCard';
import type { GqlCProfileCookBookingRequestOffersPageQuery } from '../../graphql/generated';
import { ProfileCookBookingRequestOffersPageUpdatesDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { cookStubRouteBySlug } from './cookCatalog';

const route = cookStubRouteBySlug('booking-request-offers');

export const profileCookBookingRequestOffersPageTitle = route.title;
export const profileCookBookingRequestOffersPageDescription = route.description;

const OFFER_VIEWS = ['active', 'completed', 'archived'] as const;
type OfferView = (typeof OFFER_VIEWS)[number];

export type ProfileCookBookingRequestOffersSearch = {
    view?: 'completed' | 'archived';
};

export function parseProfileCookBookingRequestOffersSearch(search: Record<string, unknown>): ProfileCookBookingRequestOffersSearch {
    if (search.view === 'completed' || search.view === 'archived') {
        return { view: search.view };
    }
    return {};
}

function offersSearchForUrl(view: OfferView): ProfileCookBookingRequestOffersSearch {
    return { view: view === 'active' ? undefined : view };
}

export function ProfileCookBookingRequestOffersPage({
    data,
    search,
}: {
    data: GqlCProfileCookBookingRequestOffersPageQuery;
    search: ProfileCookBookingRequestOffersSearch;
}) {
    const locale = useLocale();
    const navigate = useNavigate({ from: '/{-$locale}/profile/booking-request-offers' });
    const seedUser = data.currentSession.user ?? null;
    const user = useUserUpdatesSeed(seedUser, ProfileCookBookingRequestOffersPageUpdatesDocument);
    const view: OfferView = search.view === 'completed' || search.view === 'archived' ? search.view : 'active';

    const activeOffers = user?.cook?.activeOffers ?? [];
    const completedOffers = user?.cook?.completedOffers ?? [];
    const archivedOffers = user?.cook?.archivedOffers ?? [];
    const offers = { active: activeOffers, completed: completedOffers, archived: archivedOffers }[view];

    return (
        <main id="main-content" className="@container grid w-full min-w-0 content-start gap-6">
            <StatusAlert
                tone="info"
                title={t(locale, 'profileCook', 'offers.createTitle')}
                action={
                    <Button asChild variant="outline" size="sm">
                        <Link to="/{-$locale}/profile/booking-request-pool">{t(locale, 'profileCook', 'offers.createOffer')}</Link>
                    </Button>
                }
            >
                {t(locale, 'profileCook', 'offers.createBody')}
            </StatusAlert>

            <Tabs
                value={view}
                onValueChange={(value) => {
                    void navigate({ search: offersSearchForUrl(value as OfferView) });
                }}
            >
                <TabsList variant="line" aria-label={t(locale, 'profileCook', 'offers.status')}>
                    <TabsTrigger value="active">
                        {t(locale, 'profileCook', 'offers.active')}
                        <Badge variant="outline" className="bg-muted">
                            {activeOffers.length}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="completed">
                        {t(locale, 'profileCook', 'offers.completed')}
                        <Badge variant="outline" className="bg-muted">
                            {completedOffers.length}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="archived">
                        {t(locale, 'profileCook', 'offers.archive')}
                        <Badge variant="outline" className="bg-muted">
                            {archivedOffers.length}
                        </Badge>
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {offers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    {t(
                        locale,
                        'profileCook',
                        view === 'active' ? 'offers.emptyActive' : view === 'completed' ? 'offers.emptyCompleted' : 'offers.emptyArchived',
                    )}
                </p>
            ) : (
                <ul className="grid grid-cols-1 gap-4 @md:grid-cols-2 @2xl:grid-cols-3 @5xl:grid-cols-4 @7xl:grid-cols-5 @8xl:grid-cols-6">
                    {offers.map((offer) => (
                        <li key={offer.bookingRequestOfferId} className="min-w-0">
                            <CookBookingRequestOfferCard offer={offer} />
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
}
