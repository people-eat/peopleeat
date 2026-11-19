import { contentLocaleText } from '../../shared/contentSection';
import type { ExpansionMarket } from '../../shared/expansionMarkets';
import { expansionMarketCityNamesJoin, expansionMarketFaqEntries } from '../../shared/expansionMarkets';
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
    const cities = data.publicCity.findMany;
    const citiesOverride =
        cities.length > 0
            ? expansionMarketCityNamesJoin(
                  cities.map((city) => contentLocaleText(city.nameDe, city.nameEn, locale)),
                  locale,
              )
            : undefined;
    const faqs = expansionMarketFaqEntries(market, 'comingTo', locale, citiesOverride);

    return (
        <>
            <Header user={data.currentSession.user} />
            <main id="main-content" className="flex flex-col gap-16 py-16 sm:gap-24 sm:py-24">
                <SectionComingToCountryMain market={market} />
                <SectionComingToCountryCities market={market} cities={cities} />
                <SectionComingToCountryTimeline market={market} />
                <SectionComingToCountryJoin market={market} />
                <SectionQuestionsAndAnswers faqs={faqs.map((faq) => ({ question: faq.question, answer: faq.answer }))} />
            </main>
            <Footer />
        </>
    );
}
