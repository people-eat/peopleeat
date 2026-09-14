import { createFileRoute } from '@tanstack/react-router';

import { AdminMealsPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminMealsPage,
    adminMealsPageDescription,
    adminMealsPageTitle,
    adminMealsPageVariables,
    parseAdminMealsSearch,
} from '../../../web/pages/admin/AdminMealsPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/meals')({
    validateSearch: (search: Record<string, unknown>) => parseAdminMealsSearch(search),
    loaderDeps: ({ search }) => search,
    loader: ({ deps }) => routeLoaderGraphqlClient(AdminMealsPageDocument, adminMealsPageVariables(deps))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminMealsPageTitle[locale],
            description: adminMealsPageDescription[locale],
            path: '/admin/meals',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminMealsPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
