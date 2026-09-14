import { createFileRoute } from '@tanstack/react-router';

import { AdminWhatsAppChatPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminWhatsAppChatPage,
    adminWhatsAppChatPageDescription,
    adminWhatsAppChatPageTitle,
    adminWhatsAppChatPageVariables,
} from '../../../web/pages/admin/AdminWhatsAppChatPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/whats-app-chats_/$whatsAppConversationId')({
    loader: ({ params }) =>
        routeLoaderGraphqlClient(AdminWhatsAppChatPageDocument, adminWhatsAppChatPageVariables(params.whatsAppConversationId))(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminWhatsAppChatPageTitle[locale],
            description: adminWhatsAppChatPageDescription[locale],
            path: `/admin/whats-app-chats/${params.whatsAppConversationId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { whatsAppConversationId } = Route.useParams();
        return <AdminWhatsAppChatPage data={Route.useLoaderData()} whatsAppConversationId={whatsAppConversationId} />;
    },
});
