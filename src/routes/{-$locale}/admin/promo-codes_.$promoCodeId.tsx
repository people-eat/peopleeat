import { createFileRoute } from '@tanstack/react-router';

import { AdminPromoCodePageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminPromoCodePage,
    adminPromoCodePageDescription,
    adminPromoCodePageTitle,
    adminPromoCodePageVariables,
    parseAdminPromoCodeSearch,
} from '../../../web/pages/admin/AdminPromoCodePage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/promo-codes_/$promoCodeId')({
    validateSearch: (search: Record<string, unknown>) => parseAdminPromoCodeSearch(search),
    loaderDeps: ({ search }) => ({ tab: search.tab }),
    loader: ({ params, deps }) =>
        routeLoaderGraphqlClient(AdminPromoCodePageDocument, adminPromoCodePageVariables(params.promoCodeId, { tab: deps.tab }))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminPromoCodePageTitle[locale],
            description: adminPromoCodePageDescription[locale],
            path: `/admin/promo-codes/${params.promoCodeId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminPromoCodePage data={Route.useLoaderData()} search={Route.useSearch()} promoCodeId={Route.useParams().promoCodeId} />;
    },
});
