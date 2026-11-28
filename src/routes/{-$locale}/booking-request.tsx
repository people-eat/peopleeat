import { createFileRoute } from '@tanstack/react-router';

import { i18nResourcesLoad } from '../../i18n/catalogCache';
import { BookingRequestPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { BookingRequestPage } from '../../web/pages/BookingRequestPage';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageSeoText } from '../../web/seo/webPageSeoText';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';

const PUBLIC_BOOKING_I18N_NAMESPACES = ['common', 'public', 'publicBooking'] as const;

export const Route = createFileRoute('/{-$locale}/booking-request')({
    loader: async ({ params }) => {
        const locale = localeFromParam(params);
        const [data] = await Promise.all([
            routeLoaderGraphqlClient(BookingRequestPageDocument)(),
            i18nResourcesLoad(locale, PUBLIC_BOOKING_I18N_NAMESPACES),
        ]);
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
        return seoMeta({
            title: webPageSeoText(locale, webPage).title,
            description: webPageSeoText(locale, webPage).description,
            path: '/booking-request',
            locale,
            webPageUrl: webPageUrlGet(),
        });
    },
    component() {
        return <BookingRequestPage data={Route.useLoaderData()} />;
    },
});
