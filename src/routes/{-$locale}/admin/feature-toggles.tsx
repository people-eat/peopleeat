import { createFileRoute } from '@tanstack/react-router';

import { AdminFeatureTogglesPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminFeatureTogglesPage,
    adminFeatureTogglesPageDescription,
    adminFeatureTogglesPageTitle,
    parseAdminFeatureTogglesSearch,
} from '../../../web/pages/admin/AdminFeatureTogglesPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/feature-toggles')({
    validateSearch: (search: Record<string, unknown>) => parseAdminFeatureTogglesSearch(search),
    loader: routeLoaderGraphqlClient(AdminFeatureTogglesPageDocument),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminFeatureTogglesPageTitle[locale],
            description: adminFeatureTogglesPageDescription[locale],
            path: '/admin/feature-toggles',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminFeatureTogglesPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
