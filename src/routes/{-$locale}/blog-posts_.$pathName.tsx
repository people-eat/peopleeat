import { createFileRoute, notFound, redirect } from '@tanstack/react-router';

import { contentLocaleText } from '../../shared/contentSection';
import { PublicBlogPostPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { BlogPostPage } from '../../web/pages/BlogPostPage';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { DEFAULT_LOCALE, localeFromParam } from '../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/blog-posts_/$pathName')({
    loader: async (ctx) => {
        const data = await routeLoaderGraphqlClient(PublicBlogPostPageDocument, {
            pathName: ctx.params.pathName,
        })();
        const post = data.publicBlogPost.findOneByPathName;
        if (!post) {
            throw notFound();
        }
        if (post.pathName !== ctx.params.pathName) {
            const locale = localeFromParam(ctx.params);
            const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
            throw redirect({ href: `${prefix}/blog-posts/${post.pathName}`, statusCode: 301 });
        }
        return data;
    },
    staleTime: 0,
    head: ({ params, loaderData }) => {
        const locale = localeFromParam(params);
        const post = loaderData?.publicBlogPost.findOneByPathName;
        if (!post) {
            return {};
        }
        return seoMeta({
            title: contentLocaleText(post.titleDe, post.titleEn, locale),
            description: contentLocaleText(post.descriptionDe, post.descriptionEn, locale),
            path: `/blog-posts/${post.pathName}`,
            locale,
            webPageUrl: webPageUrlGet(),
            image: post.heroImageUrl ?? undefined,
            type: 'article',
        });
    },
    component() {
        return <BlogPostPage data={Route.useLoaderData()} />;
    },
});
