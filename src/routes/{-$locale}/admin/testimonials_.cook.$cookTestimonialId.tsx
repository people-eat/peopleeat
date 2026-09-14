import { createFileRoute } from '@tanstack/react-router';

import { AdminCookTestimonialPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminCookTestimonialPage,
    adminCookTestimonialPageDescription,
    adminCookTestimonialPageTitle,
} from '../../../web/pages/admin/AdminCookTestimonialPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/testimonials_/cook/$cookTestimonialId')({
    loader: ({ params }) => routeLoaderGraphqlClient(AdminCookTestimonialPageDocument, { cookTestimonialId: params.cookTestimonialId })(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminCookTestimonialPageTitle[locale],
            description: adminCookTestimonialPageDescription[locale],
            path: `/admin/testimonials/cook/${params.cookTestimonialId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { cookTestimonialId } = Route.useParams();
        return <AdminCookTestimonialPage data={Route.useLoaderData()} cookTestimonialId={cookTestimonialId} />;
    },
});
