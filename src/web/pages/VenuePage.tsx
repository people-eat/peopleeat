import { featureToggleIsActive } from '../../shared/featureToggle';
import { ContentPageView } from '../components/ContentPageView';
import { contentSectionsFromGql } from '../components/contentSectionsMap';
import type { GqlCPublicVenuePageQuery } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';

export function VenuePage({ data }: { data: GqlCPublicVenuePageQuery }) {
    const locale = useLocale();
    const venue = data.publicPartnerVenue.findOneByPathName!;
    const venuesExploreEnabled = featureToggleIsActive(data.currentSession.activeFeatureToggleKeys, 'VENUE_PAGE_VENUES_EXPLORE');

    return (
        <ContentPageView
            locale={locale}
            user={data.currentSession.user}
            page={{
                headlineDe: venue.headlineDe,
                headlineEn: venue.headlineEn,
                subHeadlineDe: venue.subHeadlineDe,
                subHeadlineEn: venue.subHeadlineEn,
                heroImageUrl: venue.heroImageUrl,
                heroImageOverlay: venue.heroImageOverlay,
                sections: contentSectionsFromGql(venue.sections),
                featuredCooks: venue.featuredCooks,
                featuredCooksShowCity: venue.featuredCooksShowCity,
                testimonials: venue.testimonials,
                chefForAnyOccasion: {
                    displayName: venue.name,
                    headlineDe: venue.firstSectionHeadlineDe,
                    headlineEn: venue.firstSectionHeadlineEn,
                    bodyDe: venue.firstSectionBodyDe,
                    bodyEn: venue.firstSectionBodyEn,
                    imageUrl: venue.firstSectionImageUrl,
                    ctaUrl: venue.firstSectionCtaUrl,
                    promo: venue.promo,
                    imageOverlay: venue.firstSectionImageOverlay,
                },
                howItWorks: true,
                howItWorksHideCta: true,
                howItWorksAlternativeMedia: venue.howItWorksAlternativeMedia,
                venuesExplore: venuesExploreEnabled,
                knownFrom: true,
            }}
        />
    );
}
