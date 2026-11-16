import { createFileRoute, redirect } from '@tanstack/react-router';

import { i18nResourcesLoad } from '../../i18n/catalogCache';
import { BookingRequestFormPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { BookingRequestFormPage, parseBookingRequestFormSearch } from '../../web/pages/BookingRequestFormPage';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageSeoText } from '../../web/seo/webPageSeoText';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';

const PUBLIC_BOOKING_I18N_NAMESPACES = ['common', 'public', 'publicBooking'] as const;

export const Route = createFileRoute('/{-$locale}/booking-request_/form')({
    validateSearch: (search: Record<string, unknown>) => parseBookingRequestFormSearch(search),
    loader: async ({ params }) => {
        const locale = localeFromParam(params);
        const [data] = await Promise.all([
            routeLoaderGraphqlClient(BookingRequestFormPageDocument)(),
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
    head: async ({ params, loaderData }) => {
        const locale = localeFromParam(params);
        await i18nResourcesLoad(locale, PUBLIC_BOOKING_I18N_NAMESPACES);
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
