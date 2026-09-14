import { createFileRoute } from '@tanstack/react-router';

import { ChatPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { AdminAssistantPage, adminAssistantPageDescription, adminAssistantPageTitle } from '../../../web/pages/admin/AdminAssistantPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/assistant_/$chatId')({
    loader: ({ params }) => routeLoaderGraphqlClient(ChatPageDocument, { chatId: params.chatId })(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminAssistantPageTitle[locale],
            description: adminAssistantPageDescription[locale],
            path: `/admin/assistant/${params.chatId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { chatId } = Route.useParams();
        return <AdminAssistantPage key={chatId} chatId={chatId} />;
    },
});
