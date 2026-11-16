import { Link } from '@tanstack/react-router';
import { useMemo } from 'react';

import type { CityCountryCode } from '../../shared/cityCountryCode';
import { cityCountryCodeLabel, cityCountryCodeOrder } from '../../shared/cityCountryCode';
import { contentLocaleText } from '../../shared/contentSection';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import type { GqlCPublicCitiesPageQuery } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { useT } from '../hooks/useT';

type CityListItem = GqlCPublicCitiesPageQuery['publicCity']['findMany'][number];

function citiesGroupedByCountry(items: readonly CityListItem[]): Array<{
    countryCode: CityCountryCode;
    cities: CityListItem[];
}> {
    const byCountry = new Map<CityCountryCode, CityListItem[]>();
    for (const countryCode of cityCountryCodeOrder) {
        byCountry.set(countryCode, []);
    }
    for (const city of items) {
        const bucket = byCountry.get(city.countryCode);
        if (bucket) {
            bucket.push(city);
        } else {
            byCountry.set(city.countryCode, [city]);
        }
    }
    return cityCountryCodeOrder
        .map((countryCode) => ({ countryCode, cities: byCountry.get(countryCode) ?? [] }))
        .filter((group) => group.cities.length > 0);
}

export function CitiesPage({ data }: { data: GqlCPublicCitiesPageQuery }) {
    const locale = useLocale();
    const { t } = useT('public');
    const groups = useMemo(() => citiesGroupedByCountry(data.publicCity.findMany), [data.publicCity.findMany]);

    return (
        <>
            <Header user={data.currentSession.user} />
            <main id="main-content" className="mx-auto w-full max-w-7xl px-4 py-16 @lg:px-6">
                <h1 className="font-serif text-4xl font-light @md:text-5xl">{t('cities.title')}</h1>
                <p className="mt-3 max-w-2xl text-muted-foreground">{t('cities.description')}</p>
                <div className="mt-12 flex flex-col gap-16">
                    {groups.length === 0 ? (
                        <p className="text-muted-foreground">{t('cities.empty')}</p>
                    ) : (
                        groups.map((group) => (
                            <section key={group.countryCode} className="flex flex-col gap-6">
                                <h2 className="font-serif text-2xl font-light @md:text-3xl">
                                    {cityCountryCodeLabel(group.countryCode, locale)}
                                </h2>
                                <ul className="grid grid-cols-1 gap-8 @md:grid-cols-2">
                                    {group.cities.map((city) => {
                                        const title = contentLocaleText(city.titleDe, city.titleEn, locale);
                                        const description = contentLocaleText(city.descriptionDe, city.descriptionEn, locale);
                                        return (
                                            <li key={city.pathName}>
                                                <Link
                                                    to="/{-$locale}/cities/$pathName"
                                                    params={{ pathName: city.pathName }}
                                                    className="group flex flex-col gap-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                >
                                                    <h3 className="font-serif text-2xl font-light group-hover:underline">{title}</h3>
                                                    <p className="text-sm text-muted-foreground">{description}</p>
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>
                        ))
                    )}
                </div>
            </main>
            <Footer />
        </>
    );
}
