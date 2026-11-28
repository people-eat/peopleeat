import { contentLocaleText } from '../../shared/contentSection';
import type { ExpansionMarket } from '../../shared/expansionMarkets';
import { expansionMarketCityNamesJoin, expansionMarketFaqEntries } from '../../shared/expansionMarkets';
import { featureToggleIsActive } from '../../shared/featureToggle';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import type { GqlCExpansionCountryPageQuery } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { SectionBenefitsForChefs } from '../sections/SectionBenefitsForChefs';
import { SectionChefOnboardingProcess } from '../sections/SectionChefOnboardingProcess';
import { SectionChefTestimonials } from '../sections/SectionChefTestimonials';
import { SectionComingToCountryCities } from '../sections/SectionComingToCountryCities';
import { SectionCookInvitePromo } from '../sections/SectionCookInvitePromo';
import { SectionHowToBecomeAChefMain } from '../sections/SectionHowToBecomeAChefMain';
import { SectionQuestionsAndAnswers } from '../sections/SectionQuestionsAndAnswers';
import { SectionReadyToBecomeAChef } from '../sections/SectionReadyToBecomeAChef';

export function FoundingChefCountryPage({ data, market }: { data: GqlCExpansionCountryPageQuery; market: ExpansionMarket }) {
    const locale = useLocale();
    const isCook = Boolean(data.currentSession.user?.cook);
    const inviteEnabled = featureToggleIsActive(data.currentSession.activeFeatureToggleKeys, 'COOK_INVITE');
    const cities = data.publicCity.findMany;
    const citiesOverride =
        cities.length > 0
            ? expansionMarketCityNamesJoin(
                  cities.map((city) => contentLocaleText(city.nameDe, city.nameEn, locale, city.nameNl)),
                  locale,
              )
            : undefined;
    const faqs = expansionMarketFaqEntries(market, 'foundingChef', locale, citiesOverride);

    return (
        <>
            <Header user={data.currentSession.user} />
            <main id="main-content" className="flex flex-col gap-16 py-16 sm:gap-24 sm:py-24">
                <SectionHowToBecomeAChefMain isCook={isCook} market={market} />
                <SectionComingToCountryCities audience="founding-chef" market={market} cities={cities} />
                <SectionChefOnboardingProcess market={market} />
                <SectionBenefitsForChefs market={market} />
                <SectionReadyToBecomeAChef isCook={isCook} market={market} />
                {inviteEnabled ? <SectionCookInvitePromo isCook={isCook} /> : null}
                <SectionChefTestimonials />
                <SectionQuestionsAndAnswers faqs={faqs.map((faq) => ({ question: faq.question, answer: faq.answer }))} />
            </main>
            <Footer />
        </>
    );
}
