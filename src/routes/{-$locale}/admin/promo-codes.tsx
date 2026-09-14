import { createFileRoute } from '@tanstack/react-router';

import { AdminPromoCodesPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminPromoCodesPage,
    adminPromoCodesPageDescription,
    adminPromoCodesPageTitle,
    adminPromoCodesPageVariables,
    parseAdminPromoCodesSearch,
} from '../../../web/pages/admin/AdminPromoCodesPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/promo-codes')({
    validateSearch: (search: Record<string, unknown>) => parseAdminPromoCodesSearch(search),
    loaderDeps: ({ search }) => search,
    loader: ({ deps }) => routeLoaderGraphqlClient(AdminPromoCodesPageDocument, adminPromoCodesPageVariables(deps))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminPromoCodesPageTitle[locale],
            description: adminPromoCodesPageDescription[locale],
            path: '/admin/promo-codes',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminPromoCodesPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
