import type { ExpansionMarket } from '../../shared/expansionMarkets';
import { expansionMarketFaqEntries } from '../../shared/expansionMarkets';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import type { GqlCExpansionCountryPageQuery } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { SectionBenefitsForChefs } from '../sections/SectionBenefitsForChefs';
import { SectionChefOnboardingProcess } from '../sections/SectionChefOnboardingProcess';
import { SectionChefTestimonials } from '../sections/SectionChefTestimonials';
import { SectionComingToCountryCities } from '../sections/SectionComingToCountryCities';
import { SectionHowToBecomeAChefMain } from '../sections/SectionHowToBecomeAChefMain';
import { SectionQuestionsAndAnswers } from '../sections/SectionQuestionsAndAnswers';
import { SectionReadyToBecomeAChef } from '../sections/SectionReadyToBecomeAChef';

export function FoundingChefCountryPage({ data, market }: { data: GqlCExpansionCountryPageQuery; market: ExpansionMarket }) {
    const locale = useLocale();
    const isCook = Boolean(data.currentSession.user?.cook);
    const faqs = expansionMarketFaqEntries(market.foundingChefFaqs, locale);

    return (
        <>
            <Header user={data.currentSession.user} />
            <main id="main-content" className="flex flex-col gap-16 py-16 sm:gap-24 sm:py-24">
                <SectionHowToBecomeAChefMain isCook={isCook} market={market} />
                <SectionComingToCountryCities audience="founding-chef" market={market} />
                <SectionChefOnboardingProcess market={market} />
                <SectionBenefitsForChefs market={market} />
                <SectionReadyToBecomeAChef isCook={isCook} market={market} />
                <SectionChefTestimonials />
                <SectionQuestionsAndAnswers faqs={faqs.map((faq) => ({ question: faq.question, answer: faq.answer }))} />
            </main>
            <Footer />
        </>
    );
}
