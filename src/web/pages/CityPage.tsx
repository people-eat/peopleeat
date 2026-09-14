import { contentLocaleText } from '../../shared/contentSection';
import { ContentPageView } from '../components/ContentPageView';
import { contentSectionsFromGql } from '../components/contentSectionsMap';
import type { GqlCPublicCityPageQuery } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { CITY_CHEF_CTA_FALLBACK_IMAGE, CITY_HERO_FALLBACK_IMAGE } from './cityPageAssets';

export function CityPage({ data }: { data: GqlCPublicCityPageQuery }) {
    const locale = useLocale();
    const city = data.publicCity.findOneByPathName!;

    return (
        <ContentPageView
            locale={locale}
            user={data.currentSession.user}
            page={{
                headlineDe: city.headlineDe,
                headlineEn: city.headlineEn,
                subHeadlineDe: city.subHeadlineDe,
                subHeadlineEn: city.subHeadlineEn,
                heroImageUrl: city.heroImageUrl,
                heroImageFallbackUrl: CITY_HERO_FALLBACK_IMAGE,
                sections: contentSectionsFromGql(city.sections),
                featuredCooks: city.featuredCooks,
                testimonials: city.testimonials,
                chefForAnyOccasion: {
                    displayName: contentLocaleText(city.nameDe, city.nameEn, locale),
                    headlineDe: city.firstSectionHeadlineDe,
                    headlineEn: city.firstSectionHeadlineEn,
                    bodyDe: city.firstSectionBodyDe,
                    bodyEn: city.firstSectionBodyEn,
                    imageUrl: city.firstSectionImageUrl ?? CITY_CHEF_CTA_FALLBACK_IMAGE,
                },
                howItWorks: true,
                cities: data.publicCity.findMany,
                knownFrom: true,
            }}
        />
    );
}
