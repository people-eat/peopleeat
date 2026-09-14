import { useNavigate } from '@tanstack/react-router';

import { Badge } from '../../components/base/badge';
import { Tabs, TabsList, TabsTrigger } from '../../components/base/tabs';
import { CookBookingRequestCard } from '../../components/CookBookingRequestCard';
import type { GqlCProfileCookBookingRequestPoolPageQuery } from '../../graphql/generated';
import { ProfileCookBookingRequestPoolPageUpdatesDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useUserUpdatesSeed } from '../../hooks/useUserUpdatesSeed';
import { cookStubRouteBySlug } from './cookCatalog';

const route = cookStubRouteBySlug('booking-request-pool');

export const profileCookBookingRequestPoolPageTitle = route.title;
export const profileCookBookingRequestPoolPageDescription = route.description;

const POOL_VIEWS = ['open', 'declined'] as const;
type PoolView = (typeof POOL_VIEWS)[number];

export type ProfileCookBookingRequestPoolSearch = {
    view?: 'declined';
};

export function parseProfileCookBookingRequestPoolSearch(search: Record<string, unknown>): ProfileCookBookingRequestPoolSearch {
    return { view: search.view === 'declined' ? 'declined' : undefined };
}

function poolSearchForUrl(view: PoolView): ProfileCookBookingRequestPoolSearch {
    return { view: view === 'declined' ? 'declined' : undefined };
}

export function ProfileCookBookingRequestPoolPage({
    data,
    search,
}: {
    data: GqlCProfileCookBookingRequestPoolPageQuery;
    search: ProfileCookBookingRequestPoolSearch;
}) {
    const locale = useLocale();
    const navigate = useNavigate({ from: '/{-$locale}/profile/booking-request-pool' });
    const seedUser = data.currentSession.user ?? null;
    const user = useUserUpdatesSeed(seedUser, ProfileCookBookingRequestPoolPageUpdatesDocument);
    const view: PoolView = search.view === 'declined' ? 'declined' : 'open';

    const openRequests = user?.cook?.openBookingRequests ?? [];
    const declinedRequests = user?.cook?.declinedBookingRequests ?? [];
    const requests = view === 'declined' ? declinedRequests : openRequests;

    return (
        <main id="main-content" className="@container grid w-full min-w-0 content-start gap-6">
            <p className="text-sm text-muted-foreground">{route.description[locale]}</p>

            <Tabs
                value={view}
                onValueChange={(value) => {
                    void navigate({ search: poolSearchForUrl(value as PoolView) });
                }}
            >
                <TabsList variant="line" aria-label={{ de: 'Anfragen-Status', en: 'Request status' }[locale]}>
                    <TabsTrigger value="open">
                        {{ de: 'Offen', en: 'Open' }[locale]}
                        <Badge variant="secondary">{openRequests.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="declined">
                        {{ de: 'Ausgeblendet', en: 'Declined' }[locale]}
                        <Badge variant="secondary">{declinedRequests.length}</Badge>
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {requests.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    {
                        {
                            open: {
                                de: 'Keine offenen Anfragen im Pool.',
                                en: 'No open requests in the pool.',
                            },
                            declined: {
                                de: 'Keine ausgeblendeten Anfragen.',
                                en: 'No declined requests.',
                            },
                        }[view][locale]
                    }
                </p>
            ) : (
                <ul className="grid grid-cols-1 gap-4 @md:grid-cols-2 @2xl:grid-cols-3 @5xl:grid-cols-4 @7xl:grid-cols-5 @8xl:grid-cols-6">
                    {requests.map((request) => (
                        <li key={request.bookingRequestId} className="min-w-0">
                            <CookBookingRequestCard request={request} variant={view === 'declined' ? 'declined' : 'open'} />
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
}
