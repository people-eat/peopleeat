import { createFileRoute } from '@tanstack/react-router';

import { AdminGiftCardsOverviewPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminGiftCardsOverviewPage,
    adminGiftCardsOverviewPageDescription,
    adminGiftCardsOverviewPageTitle,
    adminGiftCardsOverviewPageVariables,
} from '../../../web/pages/admin/AdminGiftCardsOverviewPage';
import { parseAdminOverviewRangeSearch } from '../../../web/pages/admin/adminOverviewRange';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/gift-cards')({
    validateSearch: (search: Record<string, unknown>) => parseAdminOverviewRangeSearch(search),
    loaderDeps: ({ search }) => search,
    loader: ({ deps }) => routeLoaderGraphqlClient(AdminGiftCardsOverviewPageDocument, adminGiftCardsOverviewPageVariables(deps))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminGiftCardsOverviewPageTitle[locale],
            description: adminGiftCardsOverviewPageDescription[locale],
            path: '/admin/gift-cards',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminGiftCardsOverviewPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
