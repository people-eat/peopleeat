import { createFileRoute } from '@tanstack/react-router';

import { PublicBlogPostsPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { BlogPostsPage } from '../../web/pages/BlogPostsPage';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageSeoText } from '../../web/seo/webPageSeoText';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { localeFromParam } from '../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/blog-posts')({
    loader: () => routeLoaderGraphqlClient(PublicBlogPostsPageDocument)(),
    staleTime: 0,
    head: ({ params, loaderData }) => {
        const locale = localeFromParam(params);
        const webPage = loaderData?.publicWebPage.findOne;
        if (!webPage) {
            return {};
        }
        return seoMeta({
            title: webPageSeoText(locale, webPage).title,
            description: webPageSeoText(locale, webPage).description,
            path: '/blog-posts',
            locale,
            webPageUrl: webPageUrlGet(),
        });
    },
    component() {
        return <BlogPostsPage data={Route.useLoaderData()} />;
    },
});
