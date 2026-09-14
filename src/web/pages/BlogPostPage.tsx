import { ContentPageView } from '../components/ContentPageView';
import { contentSectionsFromGql } from '../components/contentSectionsMap';
import type { GqlCPublicBlogPostPageQuery } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';

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
                sections: contentSectionsFromGql(post.sections),
            }}
        />
    );
}
