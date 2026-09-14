import { createFileRoute } from '@tanstack/react-router';

import { AdminGiftCardPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminGiftCardPage,
    adminGiftCardPageDescription,
    adminGiftCardPageTitle,
    adminGiftCardPageVariables,
} from '../../../web/pages/admin/AdminGiftCardPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/gift-cards_/$giftCardId')({
    loader: ({ params }) => routeLoaderGraphqlClient(AdminGiftCardPageDocument, adminGiftCardPageVariables(params.giftCardId))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminGiftCardPageTitle[locale],
            description: adminGiftCardPageDescription[locale],
            path: `/admin/gift-cards/${params.giftCardId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminGiftCardPage data={Route.useLoaderData()} />;
    },
});
