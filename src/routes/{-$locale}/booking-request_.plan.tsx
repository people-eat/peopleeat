import { createFileRoute, redirect } from '@tanstack/react-router';

import { t } from '../../i18n/t';
import { BookingRequestPlanPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { BookingRequestPlanPage, parseBookingRequestPlanSearch } from '../../web/pages/BookingRequestPlanPage';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/booking-request_/plan')({
    validateSearch: (search: Record<string, unknown>) => parseBookingRequestPlanSearch(search),
    loader: async ({ params, location }) => {
        const search = parseBookingRequestPlanSearch(location.search as Record<string, unknown>);
        const includeVenue = search.venueId != null;
        const data = await routeLoaderGraphqlClient(BookingRequestPlanPageDocument, {
            // Placeholder when no venue deep-link; field is skipped via @include.
            venueId: search.venueId ?? '____________________',
            includeVenue,
        })();
        if (data.currentSession.user?.cook) {
            throw redirect({
                to: '/{-$locale}/profile',
                params: { locale: params.locale },
            });
        }
        return data;
    },
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: t(locale, 'publicBooking', 'plan.seo.title'),
            description: t(locale, 'publicBooking', 'plan.seo.description'),
            path: '/booking-request/plan',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <BookingRequestPlanPage loaderData={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
