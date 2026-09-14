import { createFileRoute } from '@tanstack/react-router';

import { AdminOfferChatReviewsPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminOfferChatReviewsPage,
    adminOfferChatReviewsPageDescription,
    adminOfferChatReviewsPageTitle,
    adminOfferChatReviewsPageVariables,
} from '../../../web/pages/admin/AdminOfferChatReviewsPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/offer-chat-reviews')({
    loader: () => routeLoaderGraphqlClient(AdminOfferChatReviewsPageDocument, adminOfferChatReviewsPageVariables())(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminOfferChatReviewsPageTitle[locale],
            description: adminOfferChatReviewsPageDescription[locale],
            path: '/admin/offer-chat-reviews',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminOfferChatReviewsPage data={Route.useLoaderData()} />;
    },
});
