import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import type { GqlCHomePageQuery } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
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
    const locale = useLocale();

    return (
        <main id="main-content">
            <Header user={loaderData.currentSession.user} overMedia />

            <div className="flex flex-col gap-32">
                <SectionHero
                    media={{
                        type: 'video',
                        src: '/assets/dinner.mp4',
                        alt: {
                            de: 'Eine Familie feiert einen besonderen Anlass zu Hause mit einem Privatkoch.',
                            en: 'A family celebrates a special occasion at home with a private chef.',
                        }[locale],
                    }}
                    headline={
                        <>
                            {{ de: 'Finde einen Privatkoch', en: 'Find a private chef' }[locale]} &
                            <br />
                            {{ de: 'erlebe Außergewöhnliches', en: 'Experience something extraordinary' }[locale]}
                        </>
                    }
                    subheadline={
                        {
                            de: 'Für jeden Anlass. Mit deinen Liebsten. Bei dir zuhause.',
                            en: 'For every occasion. With your loved ones. At your home.',
                        }[locale]
                    }
                />

                <SectionExperienceSelection />
                <SectionComparison />
                <SectionHowItWorks />
                <SectionSharedExperiences />
                <SectionCustomerTestimonials />
                <SectionKnownFrom />
                <SectionQuestionsAndAnswers />
                <SectionSupport />
                <SectionCities cities={loaderData.publicCity.findMany} />
            </div>

            <Footer />
        </main>
    );
}
