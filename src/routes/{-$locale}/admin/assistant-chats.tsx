import { createFileRoute } from '@tanstack/react-router';

import { AdminAssistantChatsOverviewPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminAssistantChatsOverviewPage,
    adminAssistantChatsOverviewPageDescription,
    adminAssistantChatsOverviewPageTitle,
    adminAssistantChatsOverviewPageVariables,
} from '../../../web/pages/admin/AdminAssistantChatsOverviewPage';
import { parseAdminOverviewRangeSearch } from '../../../web/pages/admin/adminOverviewRange';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/assistant-chats')({
    validateSearch: (search: Record<string, unknown>) => parseAdminOverviewRangeSearch(search),
    loaderDeps: ({ search }) => search,
    loader: ({ deps }) =>
        routeLoaderGraphqlClient(AdminAssistantChatsOverviewPageDocument, adminAssistantChatsOverviewPageVariables(deps))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminAssistantChatsOverviewPageTitle[locale],
            description: adminAssistantChatsOverviewPageDescription[locale],
            path: '/admin/assistant-chats',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminAssistantChatsOverviewPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
