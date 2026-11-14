import type { ExpansionMarket } from '../../shared/expansionMarkets';
import { expansionMarketFaqEntries } from '../../shared/expansionMarkets';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import type { GqlCExpansionCountryPageQuery } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { SectionComingToCountryCities } from '../sections/SectionComingToCountryCities';
import { SectionComingToCountryJoin } from '../sections/SectionComingToCountryJoin';
import { SectionComingToCountryMain } from '../sections/SectionComingToCountryMain';
import { SectionComingToCountryTimeline } from '../sections/SectionComingToCountryTimeline';
import { SectionQuestionsAndAnswers } from '../sections/SectionQuestionsAndAnswers';

export function ComingToCountryPage({ data, market }: { data: GqlCExpansionCountryPageQuery; market: ExpansionMarket }) {
    const locale = useLocale();
    const faqs = expansionMarketFaqEntries(market.comingToFaqs, locale);

    return (
        <>
            <Header user={data.currentSession.user} />
            <main id="main-content" className="flex flex-col gap-16 py-16 sm:gap-24 sm:py-24">
                <SectionComingToCountryMain market={market} />
                <SectionComingToCountryCities market={market} />
                <SectionComingToCountryTimeline market={market} />
                <SectionComingToCountryJoin market={market} />
                <SectionQuestionsAndAnswers faqs={faqs.map((faq) => ({ question: faq.question, answer: faq.answer }))} />
            </main>
            <Footer />
        </>
    );
}
