import { Link } from '@tanstack/react-router';

import type { ExpansionMarket } from '../../shared/expansionMarkets';
import { expansionMarketCityList } from '../../shared/expansionMarkets';
import { useLocale } from '../hooks/useLocale';

export function SectionComingToCountryCities({
    market,
    audience = 'coming-to',
}: {
    market: ExpansionMarket;
    audience?: 'coming-to' | 'founding-chef';
}) {
    const locale = useLocale();
    const cityList = expansionMarketCityList(market, locale);
    const foundingChef = audience === 'founding-chef';

    return (
        <section className="mx-auto w-full max-w-7xl px-4 @lg:px-6">
            <h2 className="font-serif text-3xl font-light tracking-tight @md:text-5xl">
                {{ de: `Städte ${market.inCountryDe}`, en: `Cities ${market.inCountryEn}` }[locale]}
            </h2>
            <p className="mt-6 max-w-2xl text-lg/8 text-muted-foreground">
                {foundingChef
                    ? {
                          de: `Wir suchen Gründungsköche in ${cityList}. Gastgeber können dort Anfang 2027 buchen.`,
                          en: `We are looking for founding chefs in ${cityList}. Hosts can book there from early 2027.`,
                      }[locale]
                    : {
                          de: `Zum Start suchen wir Köche in ${cityList}. Nenne deinen Radius bei der Registrierung. Stadtseiten für Gastgeber folgen Anfang 2027.`,
                          en: `At launch we are looking for chefs in ${cityList}. Set your travel radius when you register. City pages for hosts follow in early 2027.`,
                      }[locale]}
            </p>
            <ul className="mt-10 divide-y divide-border border-y border-border @md:mt-14">
                {market.cities.map((city) => (
                    <li key={city.nameEn}>
                        <h3 className="py-5 font-serif text-3xl font-light tracking-tight @md:py-7 @md:text-5xl">
                            {city[locale === 'de' ? 'nameDe' : 'nameEn']}
                        </h3>
                    </li>
                ))}
            </ul>
            {foundingChef ? (
                <p className="mt-8">
                    <Link
                        to="/{-$locale}/coming-to/$country"
                        params={{ country: market.slug }}
                        className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                    >
                        {market.comingToTitle[locale]}
                    </Link>
                </p>
            ) : null}
        </section>
    );
}
