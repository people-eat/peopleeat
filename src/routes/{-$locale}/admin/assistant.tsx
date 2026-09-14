import { createFileRoute } from '@tanstack/react-router';

import { AdminAssistantPage, adminAssistantPageDescription, adminAssistantPageTitle } from '../../../web/pages/admin/AdminAssistantPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/assistant')({
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminAssistantPageTitle[locale],
            description: adminAssistantPageDescription[locale],
            path: '/admin/assistant',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminAssistantPage />;
    },
});
