import { createFileRoute, notFound } from '@tanstack/react-router';

import { AdminBlogPostPageDocument } from '../../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../../web/graphql/routeLoaderGraphqlClient';
import {
    AdminBlogPostPage,
    adminBlogPostPageDescription,
    adminBlogPostPageTitle,
    parseAdminBlogPostPageSearch,
} from '../../../web/pages/admin/AdminBlogPostPage';
import { seoMeta } from '../../../web/seo/seoMeta';
import { webPageUrlGet } from '../../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/admin/blog-posts_/$blogPostId')({
    validateSearch: (search: Record<string, unknown>) => parseAdminBlogPostPageSearch(search),
    loader: async (ctx) => {
        const data = await routeLoaderGraphqlClient(AdminBlogPostPageDocument, { blogPostId: ctx.params.blogPostId })();
        if (!data.currentSession.user?.admin?.blogPost) {
            throw notFound();
        }
        return data;
    },
    staleTime: 0,
    head: ({ params }) => {
        const locale = localeFromParam(params);
        return seoMeta({
            title: adminBlogPostPageTitle[locale],
            description: adminBlogPostPageDescription[locale],
            path: `/admin/blog-posts/${params.blogPostId}`,
            locale,
            webPageUrl: webPageUrlGet(),
            noindex: true,
        });
    },
    component() {
        const { blogPostId } = Route.useParams();
        return <AdminBlogPostPage data={Route.useLoaderData()} blogPostId={blogPostId} search={Route.useSearch()} />;
    },
});
