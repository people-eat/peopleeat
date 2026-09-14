import { createFileRoute } from '@tanstack/react-router';

import { contentLocaleText } from '../../shared/contentSection';
import { BookingRequestChatPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { BookingRequestChatPage } from '../../web/pages/BookingRequestChatPage';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/booking-request_/chat')({
    loader: () => routeLoaderGraphqlClient(BookingRequestChatPageDocument)(),
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
            path: '/booking-request/chat',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component: BookingRequestChatPage,
});
