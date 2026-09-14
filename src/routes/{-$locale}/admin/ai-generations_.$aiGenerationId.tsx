import { createFileRoute } from '@tanstack/react-router';

import { AdminAiGenerationPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminAiGenerationPage,
    adminAiGenerationPageDescription,
    adminAiGenerationPageTitle,
} from '../../../web/pages/admin/AdminAiGenerationPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/ai-generations_/$aiGenerationId')({
    loader: ({ params }) => routeLoaderGraphqlClient(AdminAiGenerationPageDocument, { aiGenerationId: params.aiGenerationId })(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminAiGenerationPageTitle[locale],
            description: adminAiGenerationPageDescription[locale],
            path: `/admin/ai-generations/${params.aiGenerationId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminAiGenerationPage data={Route.useLoaderData()} />;
    },
});
