import { createFileRoute, redirect } from '@tanstack/react-router';

import { BookingRequestFormPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { BookingRequestFormPage, parseBookingRequestFormSearch } from '../../web/pages/BookingRequestFormPage';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageSeoText } from '../../web/seo/webPageSeoText';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/booking-request_/form')({
    validateSearch: (search: Record<string, unknown>) => parseBookingRequestFormSearch(search),
    loader: async ({ params }) => {
        const data = await routeLoaderGraphqlClient(BookingRequestFormPageDocument)();
        if (data.currentSession.user?.cook) {
            throw redirect({
                to: '/{-$locale}/profile',
                params: { locale: params.locale },
            });
        }
        return data;
    },
    staleTime: 0,
    head: ({ params, loaderData }) => {
        const locale = localeFromParam(params);
        const webPage = loaderData?.publicWebPage.findOne;
        if (!webPage) {
            return {};
        }
        const { title, description } = webPageSeoText(locale, webPage, 'form', 'publicBooking');
        return seoMeta({
            title,
            description,
            path: '/booking-request/form',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <BookingRequestFormPage loaderData={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
