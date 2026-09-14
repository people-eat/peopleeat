import { createFileRoute } from '@tanstack/react-router';

import { AdminOfferChatReviewPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminOfferChatReviewPage,
    adminOfferChatReviewPageDescription,
    adminOfferChatReviewPageTitle,
    adminOfferChatReviewPageVariables,
} from '../../../web/pages/admin/AdminOfferChatReviewPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/offer-chat-reviews_/$bookingRequestOfferId')({
    loader: ({ params }) =>
        routeLoaderGraphqlClient(AdminOfferChatReviewPageDocument, adminOfferChatReviewPageVariables(params.bookingRequestOfferId))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminOfferChatReviewPageTitle[locale],
            description: adminOfferChatReviewPageDescription[locale],
            path: `/admin/offer-chat-reviews/${params.bookingRequestOfferId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { bookingRequestOfferId } = Route.useParams();
        return <AdminOfferChatReviewPage data={Route.useLoaderData()} bookingRequestOfferId={bookingRequestOfferId} />;
    },
});
