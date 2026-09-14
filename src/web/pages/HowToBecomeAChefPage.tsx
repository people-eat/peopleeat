import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import type { GqlCHowToBecomeAChefPageQuery } from '../graphql/generated';
import { SectionBenefitsForChefs } from '../sections/SectionBenefitsForChefs';
import { SectionChefOnboardingProcess } from '../sections/SectionChefOnboardingProcess';
import { SectionChefTestimonials } from '../sections/SectionChefTestimonials';
import { SectionHowToBecomeAChefMain } from '../sections/SectionHowToBecomeAChefMain';
import { SectionQuestionsAndAnswers } from '../sections/SectionQuestionsAndAnswers';
import { SectionReadyToBecomeAChef } from '../sections/SectionReadyToBecomeAChef';

export function HowToBecomeAChefPage({ data }: { data: GqlCHowToBecomeAChefPageQuery }) {
    const isCook = Boolean(data.currentSession.user?.cook);

    return (
        <>
            <Header user={data.currentSession.user} />
            <main id="main-content" className="flex flex-col gap-16 py-16 sm:gap-24 sm:py-24">
                <SectionHowToBecomeAChefMain isCook={isCook} />
                <SectionChefOnboardingProcess />
                <SectionBenefitsForChefs />
                <SectionReadyToBecomeAChef isCook={isCook} />
                <SectionChefTestimonials />
                <SectionQuestionsAndAnswers />
            </main>
            <Footer />
        </>
    );
}
