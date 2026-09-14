import { createFileRoute } from '@tanstack/react-router';

import { AdminAssistantChatPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminAssistantChatPage,
    adminAssistantChatPageDescription,
    adminAssistantChatPageTitle,
} from '../../../web/pages/admin/AdminAssistantChatPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/assistant-chats_/$chatId')({
    loader: ({ params }) => routeLoaderGraphqlClient(AdminAssistantChatPageDocument, { chatId: params.chatId })(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminAssistantChatPageTitle[locale],
            description: adminAssistantChatPageDescription[locale],
            path: `/admin/assistant-chats/${params.chatId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminAssistantChatPage data={Route.useLoaderData()} />;
    },
});
