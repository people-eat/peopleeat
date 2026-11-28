import { createFileRoute } from '@tanstack/react-router';

import { i18nResourcesLoad } from '../../i18n/catalogCache';
import { BookingRequestChatPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { BookingRequestChatPage } from '../../web/pages/BookingRequestChatPage';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageSeoText } from '../../web/seo/webPageSeoText';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';

const PUBLIC_BOOKING_I18N_NAMESPACES = ['common', 'public', 'publicBooking'] as const;

export const Route = createFileRoute('/{-$locale}/booking-request_/chat')({
    loader: async ({ params }) => {
        const locale = localeFromParam(params);
        const [data] = await Promise.all([
            routeLoaderGraphqlClient(BookingRequestChatPageDocument)(),
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
            path: '/booking-request/chat',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: BookingRequestChatPage,
});
