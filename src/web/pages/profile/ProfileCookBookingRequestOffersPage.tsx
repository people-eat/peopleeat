import { useNavigate } from '@tanstack/react-router';

import { Badge } from '../../components/base/badge';
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
            <Tabs
                value={view}
                onValueChange={(value) => {
                    void navigate({ search: offersSearchForUrl(value as OfferView) });
                }}
            >
                <TabsList variant="line" aria-label={{ de: 'Angebots-Status', en: 'Offer status' }[locale]}>
                    <TabsTrigger value="active">
                        {{ de: 'Aktiv', en: 'Active' }[locale]}
                        <Badge variant="secondary">{activeOffers.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="completed">
                        {{ de: 'Stattgefunden', en: 'Completed' }[locale]}
                        <Badge variant="secondary">{completedOffers.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="archived">
                        {{ de: 'Archiv', en: 'Archive' }[locale]}
                        <Badge variant="secondary">{archivedOffers.length}</Badge>
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {offers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    {
                        {
                            active: {
                                de: 'Keine aktiven Angebote.',
                                en: 'No active offers.',
                            },
                            completed: {
                                de: 'Noch keine stattgefundenen Events.',
                                en: 'No completed events yet.',
                            },
                            archived: {
                                de: 'Keine archivierten Angebote.',
                                en: 'No archived offers.',
                            },
                        }[view][locale]
                    }
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
