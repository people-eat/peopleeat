import { createFileRoute } from '@tanstack/react-router';

import { AdminAssistantChatsPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { adminAssistantChatsSectionPath } from '../../../web/pages/admin/adminAssistantChats';
import {
    AdminAssistantChatsPage,
    adminAssistantChatsPageDescription,
    adminAssistantChatsPageTitle,
    adminAssistantChatsPageVariables,
    parseAdminAssistantChatsSearch,
} from '../../../web/pages/admin/AdminAssistantChatsPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/assistant-chats_/list')({
    validateSearch: (search: Record<string, unknown>) => parseAdminAssistantChatsSearch(search),
    loaderDeps: ({ search }) => search,
    loader: ({ deps }) => routeLoaderGraphqlClient(AdminAssistantChatsPageDocument, adminAssistantChatsPageVariables(deps))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminAssistantChatsPageTitle[locale],
            description: adminAssistantChatsPageDescription[locale],
            path: adminAssistantChatsSectionPath('list'),
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminAssistantChatsPage data={Route.useLoaderData()} search={Route.useSearch()} />;
    },
});
