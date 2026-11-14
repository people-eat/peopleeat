import { createFileRoute, notFound, redirect } from '@tanstack/react-router';

import { contentLocaleText } from '../../shared/contentSection';
import { PublicBlogPostPageDocument } from '../../web/graphql/generated';
import { routeLoaderGraphqlClient } from '../../web/graphql/routeLoaderGraphqlClient';
import { blogIndexLinkLabel, BlogPostPage } from '../../web/pages/BlogPostPage';
import { jsonLdBlogPosting, jsonLdBreadcrumbList, jsonLdHeadScripts } from '../../web/seo/jsonLd';
import { SITE_NAME } from '../../web/seo/seoConstants';
import { seoMeta } from '../../web/seo/seoMeta';
import { webPageUrlGet } from '../../web/seo/webPageUrlGet';
import { DEFAULT_LOCALE, localeFromParam } from '../../web/utils/locale';

export const Route = createFileRoute('/{-$locale}/blog-posts_/$pathName')({
    loader: async (ctx) => {
        const data = await routeLoaderGraphqlClient(PublicBlogPostPageDocument, {
            pathName: ctx.params.pathName,
            includeLastVisitedCookProfiles: true,
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
        const webPageUrl = webPageUrlGet();
        const path = `/blog-posts/${post.pathName}`;
        const title = contentLocaleText(post.titleDe, post.titleEn, locale);
        const description = contentLocaleText(post.descriptionDe, post.descriptionEn, locale);
        const headline = contentLocaleText(post.headlineDe, post.headlineEn, locale).trim();
        const lead = contentLocaleText(post.subHeadlineDe, post.subHeadlineEn, locale).trim();
        const visibleHeadline = headline || title;
        const visibleDescription = lead || description;
        return {
            ...seoMeta({
                title,
                description,
                path,
                locale,
                webPageUrl,
                image: post.heroImageUrl ?? undefined,
                type: 'article',
            }),
            scripts: jsonLdHeadScripts([
                jsonLdBreadcrumbList(webPageUrl, locale, [
                    { name: SITE_NAME, path: '/' },
                    { name: blogIndexLinkLabel(locale), path: '/blog-posts' },
                    { name: visibleHeadline, path },
                ]),
                jsonLdBlogPosting({
                    webPageUrl,
                    locale,
                    path,
                    headline: visibleHeadline,
                    description: visibleDescription,
                    datePublished: post.publishedAt,
                    dateModified: post.updatedAt,
                    image: post.heroImageUrl,
                }),
            ]),
        };
    },
    component() {
        return <BlogPostPage data={Route.useLoaderData()} />;
    },
});
