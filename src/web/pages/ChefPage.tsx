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
import { publicChefUrl } from '../utils/webShare';

export function ChefPage({ data }: { data: GqlCChefPageQuery }) {
    const locale = useLocale();
    const cook = data.publicCook.findOne!;
    const [, trackDiscovery] = useMutation(ChefsDiscoveryTrackDocument);
    const shareEnabled = featureToggleIsActive(data.currentSession.activeFeatureToggleKeys, 'COOK_PUBLIC_PROFILE_SHARE');
    const displayName = cook.user.display;
    const view: ChefProfileViewModel = {
        displayName,
        profilePictureUrl: cook.user.profilePicture?.url ?? null,
        city: cook.city,
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
            location: testimonial.location,
            occasion: testimonial.occasion,
            body: testimonial.body,
            rating: testimonial.rating,
            imageUrls: testimonial.imageUrls,
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
                interaction: { type: 'click', key: chefsDiscoveryBookCtaKey },
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
            <Header user={data.currentSession.user} />
            <main id="main-content">
                <ChefProfileView
                    cook={view}
                    onBookCtaClick={onBookCtaClick}
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
                                url={publicChefUrl(cook.cookId, locale)}
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
