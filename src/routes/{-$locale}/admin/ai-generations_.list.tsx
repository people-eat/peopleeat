import { createFileRoute } from '@tanstack/react-router';

import { AdminAiGenerationsPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { adminAiGenerationsSectionPath } from '../../../web/pages/admin/adminAiGenerations';
import {
    AdminAiGenerationsPage,
    adminAiGenerationsPageDescription,
    adminAiGenerationsPageTitle,
    adminAiGenerationsPageVariables,
    parseAdminAiGenerationsSearch,
} from '../../../web/pages/admin/AdminAiGenerationsPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/ai-generations_/list')({
    validateSearch: (search: Record<string, unknown>) => parseAdminAiGenerationsSearch(search),
    loaderDeps: ({ search }) => search,
    loader: ({ deps }) => routeLoaderGraphqlClient(AdminAiGenerationsPageDocument, adminAiGenerationsPageVariables(deps))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminAiGenerationsPageTitle[locale],
            description: adminAiGenerationsPageDescription[locale],
            path: adminAiGenerationsSectionPath('list'),
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminAiGenerationsPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
