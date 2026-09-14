import { createFileRoute } from '@tanstack/react-router';

import { AdminGiftCardsPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { adminGiftCardsSectionPath } from '../../../web/pages/admin/adminGiftCards';
import {
    AdminGiftCardsPage,
    adminGiftCardsPageDescription,
    adminGiftCardsPageTitle,
    adminGiftCardsPageVariables,
    parseAdminGiftCardsSearch,
} from '../../../web/pages/admin/AdminGiftCardsPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/gift-cards_/list')({
    validateSearch: (search: Record<string, unknown>) => parseAdminGiftCardsSearch(search),
    loaderDeps: ({ search }) => search,
    loader: ({ deps }) => routeLoaderGraphqlClient(AdminGiftCardsPageDocument, adminGiftCardsPageVariables(deps))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminGiftCardsPageTitle[locale],
            description: adminGiftCardsPageDescription[locale],
            path: adminGiftCardsSectionPath('list'),
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminGiftCardsPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
