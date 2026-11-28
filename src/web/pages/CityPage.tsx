import { t } from '../../i18n/t';
import type { CityCountryCode } from '../../shared/cityCountryCode';
import { cityCountryHubLinkLabel } from '../../shared/cityCountryCode';
import { contentLocaleText } from '../../shared/contentSection';
import type { Locale } from '../../shared/locale';
import type { ContentPageIndexLink } from '../components/contentPageIndexLink';
import { ContentPageView } from '../components/ContentPageView';
import { contentSectionsFromGql } from '../components/contentSectionsMap';
import type { GqlCPublicCityPageQuery } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { CITY_CHEF_CTA_FALLBACK_IMAGE, CITY_HERO_FALLBACK_IMAGE } from './cityPageAssets';

export function cityIndexLinkLabel(locale: Locale): string {
    return t(locale, 'public', 'cities.indexLink');
}

function cityIndexLink(countryCode: CityCountryCode, locale: Locale): ContentPageIndexLink {
    if (countryCode === 'NL') {
        return {
            to: '/{-$locale}/coming-to/$country',
            params: { country: 'netherlands' },
            label: cityCountryHubLinkLabel(countryCode, locale),
        };
    }
    if (countryCode === 'CH') {
        return {
            to: '/{-$locale}/coming-to/$country',
            params: { country: 'switzerland' },
            label: cityCountryHubLinkLabel(countryCode, locale),
        };
    }
    return { to: '/{-$locale}/cities', label: cityIndexLinkLabel(locale) };
}

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
                headlineNl: city.headlineNl,
                subHeadlineDe: city.subHeadlineDe,
                subHeadlineEn: city.subHeadlineEn,
                subHeadlineNl: city.subHeadlineNl,
                heroImageUrl: city.heroImageUrl,
                heroImageFallbackUrl: CITY_HERO_FALLBACK_IMAGE,
                sections: contentSectionsFromGql(city.sections),
                featuredCooks: city.featuredCooks,
                testimonials: city.testimonials,
                chefForAnyOccasion: {
                    displayName: contentLocaleText(city.nameDe, city.nameEn, locale, city.nameNl),
                    headlineDe: city.firstSectionHeadlineDe,
                    headlineEn: city.firstSectionHeadlineEn,
                    headlineNl: city.firstSectionHeadlineNl,
                    bodyDe: city.firstSectionBodyDe,
                    bodyEn: city.firstSectionBodyEn,
                    bodyNl: city.firstSectionBodyNl,
                    imageUrl: city.firstSectionImageUrl ?? CITY_CHEF_CTA_FALLBACK_IMAGE,
                    imageAlt: city.firstSectionImageUrl
                        ? t(locale, 'common', 'imageAlt.photoOf', {
                              name: contentLocaleText(city.nameDe, city.nameEn, locale, city.nameNl),
                          })
                        : t(locale, 'public', 'cities.ctaFallbackAlt'),
                },
                howItWorks: true,
                cities: data.publicCity.findMany,
                citiesCountryCode: city.countryCode,
                knownFrom: true,
                indexLink: cityIndexLink(city.countryCode, locale),
            }}
        />
    );
}
