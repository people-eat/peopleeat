import { Link } from '@tanstack/react-router';

import { contentLocaleText } from '../../shared/contentSection';
import type { ExpansionMarket } from '../../shared/expansionMarkets';
import {
    expansionMarketCityList,
    expansionMarketCityNamesJoin,
    expansionMarketComingToTitle,
    expansionMarketInCountryPhrase,
} from '../../shared/expansionMarkets';
import { useLocale } from '../hooks/useLocale';
import { useT } from '../hooks/useT';

export type ComingToCountryCity = {
    pathName: string;
    nameDe: string;
    nameEn: string;
    latitude: number;
    longitude: number;
};

export function SectionComingToCountryCities({
    market,
    cities,
    audience = 'coming-to',
}: {
    market: ExpansionMarket;
    cities: readonly ComingToCountryCity[];
    audience?: 'coming-to' | 'founding-chef';
}) {
    const locale = useLocale();
    const { t } = useT('public');
    const cityNames = cities.map((city) => contentLocaleText(city.nameDe, city.nameEn, locale));
    const cityList = cityNames.length > 0 ? expansionMarketCityNamesJoin(cityNames, locale) : expansionMarketCityList(market, locale);
    const foundingChef = audience === 'founding-chef';
    const inCountry = expansionMarketInCountryPhrase(market, locale);

    return (
        <section className="mx-auto w-full max-w-7xl px-4 @lg:px-6">
            <h2 className="font-serif text-3xl font-light tracking-tight @md:text-5xl">{t('comingTo.citiesTitle', { inCountry })}</h2>
            <p className="mt-6 max-w-2xl text-lg/8 text-muted-foreground">
                {foundingChef ? t('comingTo.citiesFounding', { cities: cityList }) : t('comingTo.citiesComingTo', { cities: cityList })}
            </p>
            {cityNames.length > 0 ? (
                <ul className="mt-10 divide-y divide-border border-y border-border @md:mt-14">
                    {cities.map((city) => (
                        <li key={city.pathName}>
                            <h3 className="py-5 font-serif text-3xl font-light tracking-tight @md:py-7 @md:text-5xl">
                                {contentLocaleText(city.nameDe, city.nameEn, locale)}
                            </h3>
                        </li>
                    ))}
                </ul>
            ) : null}
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
