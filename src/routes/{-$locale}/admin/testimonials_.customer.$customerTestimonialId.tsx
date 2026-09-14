import { createFileRoute } from '@tanstack/react-router';

import { AdminCustomerTestimonialPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminCustomerTestimonialPage,
    adminCustomerTestimonialPageDescription,
    adminCustomerTestimonialPageTitle,
} from '../../../web/pages/admin/AdminCustomerTestimonialPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/testimonials_/customer/$customerTestimonialId')({
    loader: ({ params }) =>
        routeLoaderGraphqlClient(AdminCustomerTestimonialPageDocument, { customerTestimonialId: params.customerTestimonialId })(),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminCustomerTestimonialPageTitle[locale],
            description: adminCustomerTestimonialPageDescription[locale],
            path: `/admin/testimonials/customer/${params.customerTestimonialId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { customerTestimonialId } = Route.useParams();
        return <AdminCustomerTestimonialPage data={Route.useLoaderData()} customerTestimonialId={customerTestimonialId} />;
    },
});
