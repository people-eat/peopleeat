import { ContentPageView } from '../components/ContentPageView';
import { contentSectionsFromGql } from '../components/contentSectionsMap';
import type { GqlCPublicOccasionPageQuery } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';

export function OccasionPage({ data }: { data: GqlCPublicOccasionPageQuery }) {
    const locale = useLocale();
    const occasion = data.publicOccasion.findOneByPathName!;

    return (
        <ContentPageView
            locale={locale}
            user={data.currentSession.user}
            page={{
                headlineDe: occasion.headlineDe,
                headlineEn: occasion.headlineEn,
                subHeadlineDe: occasion.subHeadlineDe,
                subHeadlineEn: occasion.subHeadlineEn,
                heroImageUrl: occasion.heroImageUrl,
                sections: contentSectionsFromGql(occasion.sections),
                featuredCooks: occasion.featuredCooks,
                testimonials: occasion.testimonials,
                chefForAnyOccasion: {
                    displayName: occasion.name,
                    headlineDe: occasion.firstSectionHeadlineDe,
                    headlineEn: occasion.firstSectionHeadlineEn,
                    bodyDe: occasion.firstSectionBodyDe,
                    bodyEn: occasion.firstSectionBodyEn,
                    imageUrl: occasion.firstSectionImageUrl,
                    promo: occasion.promo,
                },
                formatsSection: {
                    titleDe: occasion.formatsSection.titleDe,
                    titleEn: occasion.formatsSection.titleEn,
                    subtitleDe: occasion.formatsSection.subtitleDe,
                    subtitleEn: occasion.formatsSection.subtitleEn,
                    cards: [
                        occasion.formatsSection.cards[0]!,
                        occasion.formatsSection.cards[1]!,
                        occasion.formatsSection.cards[2]!,
                    ] as const,
                },
            }}
        />
    );
}
