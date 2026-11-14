import { featureToggleIsActive } from '../../shared/featureToggle';
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
    const lastVisitedEnabled = featureToggleIsActive(data.currentSession.activeFeatureToggleKeys, 'LAST_VISITED_COOK_PROFILES');
    const lastVisitedCooks =
        lastVisitedEnabled && (data.currentSession.lastVisitedCookProfiles?.length ?? 0) > 0
            ? data.currentSession.lastVisitedCookProfiles
            : undefined;

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
                lastVisitedCooks,
            }}
        />
    );
}
