import { Link } from '@tanstack/react-router';

import { expansionMarketCityList, expansionMarketComingToTitle } from '../../shared/expansionMarkets';
import type { ExpansionMarket } from '../../shared/expansionMarkets';
import { useLocale } from '../hooks/useLocale';
import { useT } from '../hooks/useT';

export function SectionComingToCountryCities({
    market,
    audience = 'coming-to',
}: {
    market: ExpansionMarket;
    audience?: 'coming-to' | 'founding-chef';
}) {
    const locale = useLocale();
    const { t } = useT('public');
    const cityList = expansionMarketCityList(market, locale);
    const foundingChef = audience === 'founding-chef';
    const inCountry = locale === 'de' ? market.inCountryDe : market.inCountryEn;

    return (
        <section className="mx-auto w-full max-w-7xl px-4 @lg:px-6">
            <h2 className="font-serif text-3xl font-light tracking-tight @md:text-5xl">{t('comingTo.citiesTitle', { inCountry })}</h2>
            <p className="mt-6 max-w-2xl text-lg/8 text-muted-foreground">
                {foundingChef ? t('comingTo.citiesFounding', { cities: cityList }) : t('comingTo.citiesComingTo', { cities: cityList })}
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
                        {expansionMarketComingToTitle(market, locale)}
                    </Link>
                </p>
            ) : null}
        </section>
    );
}
