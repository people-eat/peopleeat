import { createFileRoute } from '@tanstack/react-router';

import { AdminTestimonialsPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminTestimonialsPage,
    adminTestimonialsPageDescription,
    adminTestimonialsPageTitle,
} from '../../../web/pages/admin/AdminTestimonialsPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/testimonials')({
    loader: routeLoaderGraphqlClient(AdminTestimonialsPageDocument),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminTestimonialsPageTitle[locale],
            description: adminTestimonialsPageDescription[locale],
            path: '/admin/testimonials',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminTestimonialsPage data={Route.useLoaderData()} />;
    },
});
