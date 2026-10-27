import { createFileRoute, redirect } from '@tanstack/react-router';

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
        const includePartner = search.partnerId != null;
        const data = await routeLoaderGraphqlClient(BookingRequestPlanPageDocument, {
            // Placeholder when no partner deep-link; field is skipped via @include.
            partnerId: search.partnerId ?? '____________________',
            includePartner,
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
            title: {
                de: 'Dinner planen · PeopleEat',
                en: 'Plan your dinner · PeopleEat',
            }[locale],
            description: {
                de: 'Plant euer privates 3-Gänge-Dinner in zwei Schritten. Unverbindlich und ohne Zahlung.',
                en: 'Plan your private three-course dinner in two steps. Non-binding and with no payment yet.',
            }[locale],
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
