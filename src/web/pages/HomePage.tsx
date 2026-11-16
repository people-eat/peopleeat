import { featureToggleIsActive } from '../../shared/featureToggle';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import type { GqlCHomePageQuery } from '../graphql/generated';
import { useT } from '../hooks/useT';
import { SectionBookingHowItWorks } from '../sections/SectionBookingHowItWorks';
import { SectionCities } from '../sections/SectionCities';
import { SectionComparison } from '../sections/SectionComparison';
import { SectionCustomerTestimonials } from '../sections/SectionCustomerTestimonials';
import { SectionExperienceSelection } from '../sections/SectionExperienceSelection';
import { SectionHero } from '../sections/SectionHero';
import { SectionHowItWorks } from '../sections/SectionHowItWorks';
import { SectionKnownFrom } from '../sections/SectionKnownFrom';
import { SectionQuestionsAndAnswers } from '../sections/SectionQuestionsAndAnswers';
import { SectionSharedExperiences } from '../sections/SectionSharedExperiences';
import { SectionSupport } from '../sections/SectionSupport';

export function HomePage({ loaderData }: { loaderData: GqlCHomePageQuery }) {
    const { t } = useT('public');
    const bookingHowItWorksEnabled = featureToggleIsActive(
        loaderData.currentSession.activeFeatureToggleKeys,
        'LANDING_BOOKING_HOW_IT_WORKS',
    );
    const testimonialCardsEnabled = featureToggleIsActive(loaderData.currentSession.activeFeatureToggleKeys, 'LANDING_TESTIMONIAL_CARDS');

    return (
        <main id="main-content">
            <Header user={loaderData.currentSession.user} overMedia />

            <div className="flex flex-col gap-32">
                <SectionHero
                    media={{
                        type: 'video',
                        src: '/assets/dinner.mp4',
                        alt: t('home.hero.mediaAlt'),
                    }}
                    headline={
                        <>
                            {t('home.hero.headline1')} &
                            <br />
                            {t('home.hero.headline2')}
                        </>
                    }
                    subheadline={t('home.hero.subheadline')}
                />

                <SectionExperienceSelection />
                <SectionComparison />
                {bookingHowItWorksEnabled ? <SectionBookingHowItWorks /> : null}
                <SectionHowItWorks />
                <SectionSharedExperiences />
                <SectionCustomerTestimonials variant={testimonialCardsEnabled ? 'cards' : 'marquee'} />
                <SectionKnownFrom />
                <SectionQuestionsAndAnswers />
                <SectionSupport />
                <SectionCities cities={loaderData.publicCity.findMany} showExpansionHubs />
            </div>

            <Footer />
        </main>
    );
}
