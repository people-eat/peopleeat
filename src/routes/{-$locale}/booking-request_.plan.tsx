import { createFileRoute, redirect } from '@tanstack/react-router';

import { i18nResourcesLoad } from '../../i18n/catalogCache';
import { t } from '../../i18n/t';
import { BookingRequestPlanPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { BookingRequestPlanPage, parseBookingRequestPlanSearch } from '../../web/pages/BookingRequestPlanPage';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';

const PUBLIC_BOOKING_I18N_NAMESPACES = ['common', 'public', 'publicBooking'] as const;

export const Route = createFileRoute('/{-$locale}/booking-request_/plan')({
    validateSearch: (search: Record<string, unknown>) => parseBookingRequestPlanSearch(search),
    loader: async ({ params, location }) => {
        const locale = localeFromParam(params);
        const search = parseBookingRequestPlanSearch(location.search as Record<string, unknown>);
        const includeVenue = search.venueId != null;
        const [data] = await Promise.all([
            routeLoaderGraphqlClient(BookingRequestPlanPageDocument, {
                // Placeholder when no venue deep-link; field is skipped via @include.
                venueId: search.venueId ?? '____________________',
                includeVenue,
            })(),
            i18nResourcesLoad(locale, PUBLIC_BOOKING_I18N_NAMESPACES),
        ]);
        if (data.currentSession.user?.cook) {
            throw redirect({
                to: '/{-$locale}/profile',
                params: { locale: params.locale },
            });
        }
        return data;
    },
    staleTime: 0,
    head: async ({ params }) => {
        const locale = localeFromParam(params);
        await i18nResourcesLoad(locale, PUBLIC_BOOKING_I18N_NAMESPACES);
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
