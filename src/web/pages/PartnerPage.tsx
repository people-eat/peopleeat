import { ContentPageView } from '../components/ContentPageView';
import { contentSectionsFromGql } from '../components/contentSectionsMap';
import type { GqlCPublicPartnerPageQuery } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';

export function PartnerPage({ data }: { data: GqlCPublicPartnerPageQuery }) {
    const locale = useLocale();
    const partner = data.publicPartner.findOneByPathName!;

    return (
        <ContentPageView
            locale={locale}
            user={data.currentSession.user}
            page={{
                headlineDe: partner.headlineDe,
                headlineEn: partner.headlineEn,
                subHeadlineDe: partner.subHeadlineDe,
                subHeadlineEn: partner.subHeadlineEn,
                heroImageUrl: partner.heroImageUrl,
                sections: contentSectionsFromGql(partner.sections),
                featuredCooks: partner.featuredCooks,
                testimonials: partner.testimonials,
                chefForAnyOccasion: {
                    displayName: partner.name,
                    headlineDe: partner.firstSectionHeadlineDe,
                    headlineEn: partner.firstSectionHeadlineEn,
                    bodyDe: partner.firstSectionBodyDe,
                    bodyEn: partner.firstSectionBodyEn,
                    imageUrl: partner.firstSectionImageUrl,
                    ctaUrl: partner.firstSectionCtaUrl,
                    promo: partner.promo,
                },
            }}
        />
    );
}
