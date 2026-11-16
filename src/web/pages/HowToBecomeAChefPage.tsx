import { featureToggleIsActive } from '../../shared/featureToggle';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import type { GqlCHowToBecomeAChefPageQuery } from '../graphql/generated';
import { SectionBenefitsForChefs } from '../sections/SectionBenefitsForChefs';
import { SectionChefOnboardingProcess } from '../sections/SectionChefOnboardingProcess';
import { SectionChefTestimonials } from '../sections/SectionChefTestimonials';
import { SectionCookInvitePromo } from '../sections/SectionCookInvitePromo';
import { SectionExpansionMarkets } from '../sections/SectionExpansionMarkets';
import { SectionHowToBecomeAChefMain } from '../sections/SectionHowToBecomeAChefMain';
import { SectionQuestionsAndAnswers } from '../sections/SectionQuestionsAndAnswers';
import { SectionReadyToBecomeAChef } from '../sections/SectionReadyToBecomeAChef';

export function HowToBecomeAChefPage({ data }: { data: GqlCHowToBecomeAChefPageQuery }) {
    const isCook = Boolean(data.currentSession.user?.cook);
    const inviteEnabled = featureToggleIsActive(data.currentSession.activeFeatureToggleKeys, 'COOK_INVITE');

    return (
        <>
            <Header user={data.currentSession.user} />
            <main id="main-content" className="flex flex-col gap-16 py-16 sm:gap-24 sm:py-24">
                <SectionHowToBecomeAChefMain isCook={isCook} />
                <SectionChefOnboardingProcess />
                <SectionBenefitsForChefs />
                <SectionReadyToBecomeAChef isCook={isCook} />
                {inviteEnabled ? <SectionCookInvitePromo isCook={isCook} /> : null}
                <SectionExpansionMarkets />
                <SectionChefTestimonials />
                <SectionQuestionsAndAnswers />
            </main>
            <Footer />
        </>
    );
}
