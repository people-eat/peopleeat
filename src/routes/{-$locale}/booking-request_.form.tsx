import { createFileRoute, redirect } from '@tanstack/react-router';

import { contentLocaleText } from '../../shared/contentSection';
import { BookingRequestFormPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { BookingRequestFormPage, parseBookingRequestFormSearch } from '../../web/pages/BookingRequestFormPage';
import { seoMeta } from '../../web/seo/seoMeta';
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
        return seoMeta({
            title: contentLocaleText(webPage.titleDe, webPage.titleEn, locale),
            description: contentLocaleText(webPage.descriptionDe, webPage.descriptionEn, locale),
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
