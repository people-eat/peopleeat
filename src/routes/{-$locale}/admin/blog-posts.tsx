import { createFileRoute } from '@tanstack/react-router';

import { AdminBlogPostsPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import { AdminBlogPostsPage, adminBlogPostsPageDescription, adminBlogPostsPageTitle } from '../../../web/pages/admin/AdminBlogPostsPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/blog-posts')({
    loader: routeLoaderGraphqlClient(AdminBlogPostsPageDocument),
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminBlogPostsPageTitle[locale],
            description: adminBlogPostsPageDescription[locale],
            path: '/admin/blog-posts',
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        return <AdminBlogPostsPage data={Route.useLoaderData()} />;
    },
});
