import { useMutation } from 'urql';

import { chefsDiscoveryArea, chefsDiscoveryBookCtaKey, chefsDiscoveryShareKey } from '../../shared/chefsDiscovery';
import { featureToggleIsActive } from '../../shared/featureToggle';
import { ChefProfileView } from '../components/ChefProfileView';
import type { ChefProfileViewModel } from '../components/ChefProfileView';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { ShareButton } from '../components/ShareButton';
import type { GqlCChefPageQuery } from '../graphql/generated';
import { ChefsDiscoveryTrackDocument } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { chefPageCityLabel } from '../seo/chefPageSeo';
import { publicChefUrl } from '../utils/webShare';

export function ChefPage({ data }: { data: GqlCChefPageQuery }) {
    const locale = useLocale();
    const cook = data.publicCook.findOneByPathName!;
    const [, trackDiscovery] = useMutation(ChefsDiscoveryTrackDocument);
    const shareEnabled = featureToggleIsActive(data.currentSession.activeFeatureToggleKeys, 'COOK_PUBLIC_PROFILE_SHARE');
    const displayName = cook.user.display;
    const cityLabel = chefPageCityLabel(locale, cook.city, cook.cityPage);
    const directEnabled =
        featureToggleIsActive(data.currentSession.activeFeatureToggleKeys, 'BOOKING_REQUEST_COOK_DIRECT') && cook.canReceiveDirectRequests;
    const bookCta = directEnabled
        ? {
              cookId: cook.cookId,
              label: { de: `Anfrage an ${displayName} senden`, en: `Send ${displayName} a request` }[locale],
              underline: {
                  de: 'Kostenlos und unverbindlich. Du erhältst ein Angebot mit Menü und Preis.',
                  en: 'Free, with no commitment. They send an offer with menu and price.',
              }[locale],
          }
        : undefined;
    const view: ChefProfileViewModel = {
        displayName,
        profilePictureUrl: cook.user.profilePicture?.url ?? null,
        city: cityLabel,
        cityPath: cook.cityPage?.pathName ?? null,
        cuisineStyle: cook.cuisineStyle,
        cookingPhilosophy: cook.cookingPhilosophy,
        biography: cook.biography,
        biographySummary: cook.biographySummary,
        logoUrl: cook.logo?.url ?? null,
        meals: cook.meals.map((meal) => ({
            mealId: meal.mealId,
            title: meal.title,
            description: meal.description,
            imageUrl: meal.imageUrl,
        })),
        testimonials: cook.testimonials.map((testimonial) => ({
            customerTestimonialId: testimonial.customerTestimonialId,
            authorName: testimonial.authorName,
            authorProfilePictureUrl: testimonial.authorProfilePicture?.url ?? null,
            location: testimonial.location,
            occasion: testimonial.occasion,
            body: testimonial.body,
            rating: testimonial.rating,
            imageUrls: testimonial.imageUrls,
            createdAt: testimonial.createdAt,
        })),
        // Hero rating row only when there is at least one published review;
        // omit so visitors never see “no reviews yet” on the public page.
        rating: cook.rating.reviewCount > 0 ? cook.rating : undefined,
    };

    function onBookCtaClick() {
        void trackDiscovery({
            input: {
                webPageKey: 'CHEFS',
                area: chefsDiscoveryArea,
                interaction: { type: 'click', key: chefsDiscoveryBookCtaKey, cookId: cook.cookId },
            },
        });
    }

    function onShared() {
        void trackDiscovery({
            input: {
                webPageKey: 'CHEFS',
                area: chefsDiscoveryArea,
                interaction: { type: 'click', key: chefsDiscoveryShareKey },
            },
        });
    }

    return (
        <>
            <Header user={data.currentSession.user} bookingRequestFormSearch={directEnabled ? { cookId: cook.cookId } : undefined} />
            <main id="main-content">
                <ChefProfileView
                    cook={view}
                    onBookCtaClick={onBookCtaClick}
                    bookCta={bookCta}
                    shareButton={
                        shareEnabled ? (
                            <ShareButton
                                title={displayName}
                                text={
                                    {
                                        de: `Schau dir ${displayName} auf peopleeat an`,
                                        en: `Check out ${displayName} on peopleeat`,
                                    }[locale]
                                }
                                url={publicChefUrl(cook.pathName, locale)}
                                variant="secondary"
                                onShared={onShared}
                            />
                        ) : undefined
                    }
                />
            </main>
            <Footer />
        </>
    );
}
