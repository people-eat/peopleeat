import type { Locale } from '../../shared/locale';
import { ContentPageView } from '../components/ContentPageView';
import { contentSectionsFromGql } from '../components/contentSectionsMap';
import type { GqlCPublicBlogPostPageQuery } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';

export function blogIndexLinkLabel(locale: Locale): string {
    return { de: 'Alle Beiträge', en: 'All articles' }[locale];
}

export function BlogPostPage({ data }: { data: GqlCPublicBlogPostPageQuery }) {
    const locale = useLocale();
    const post = data.publicBlogPost.findOneByPathName!;

    return (
        <ContentPageView
            locale={locale}
            user={data.currentSession.user}
            page={{
                headlineDe: post.headlineDe,
                headlineEn: post.headlineEn,
                subHeadlineDe: post.subHeadlineDe,
                subHeadlineEn: post.subHeadlineEn,
                heroImageUrl: post.heroImageUrl,
                heroVariant: 'article',
                indexLink: { to: '/{-$locale}/blog-posts', label: blogIndexLinkLabel(locale) },
                sections: contentSectionsFromGql(post.sections),
            }}
        />
    );
}
