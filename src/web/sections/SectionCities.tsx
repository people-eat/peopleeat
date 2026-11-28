import { Link } from '@tanstack/react-router';

import type { CityCountryCode } from '../../shared/cityCountryCode';
import { cityCountryCitiesHeading, cityCountryCodeLabel, cityCountryHubPath } from '../../shared/cityCountryCode';
import { contentLocaleText } from '../../shared/contentSection';
import { Button } from '../components/base/button';
import { useLocale } from '../hooks/useLocale';
import { useT } from '../hooks/useT';
import { cn } from '../utils/cn';

export type SectionCitiesCity = {
    pathName: string;
    nameDe: string;
    nameEn: string;
    nameNl?: string;
    countryCode: CityCountryCode;
};

const EXPANSION_HUBS = [
    { countryCode: 'NL' as const, country: 'netherlands' as const },
    { countryCode: 'CH' as const, country: 'switzerland' as const },
];

function CountryHubLink({ countryCode, label }: { countryCode: CityCountryCode; label: string }) {
    const hubPath = cityCountryHubPath(countryCode);
    if (hubPath === '/coming-to/netherlands') {
        return (
            <Link to="/{-$locale}/coming-to/$country" params={{ country: 'netherlands' }}>
                {label}
            </Link>
        );
    }
    if (hubPath === '/coming-to/switzerland') {
        return (
            <Link to="/{-$locale}/coming-to/$country" params={{ country: 'switzerland' }}>
                {label}
            </Link>
        );
    }
    return <Link to="/{-$locale}/cities">{label}</Link>;
}

export function SectionCities({
    cities,
    countryCode,
    showExpansionHubs = false,
    className,
}: {
    cities: readonly SectionCitiesCity[];
    /** When set, only list cities in that market (city detail siblings). */
    countryCode?: CityCountryCode;
    /** Homepage: always-visible NL/CH hub links under the DE grid. */
    showExpansionHubs?: boolean;
    className?: string;
}) {
    const locale = useLocale();
    const { t } = useT('public');
    const listed = countryCode
        ? cities.filter((city) => city.countryCode === countryCode)
        : cities.filter((city) => city.countryCode === 'DE');
    const seeAllCountry = countryCode ?? 'DE';
    const seeAllLabel = seeAllCountry === 'DE' ? t('cities.seeAll') : cityCountryCodeLabel(seeAllCountry, locale);
    const title = cityCountryCitiesHeading(seeAllCountry, locale);

    if (listed.length === 0 && !showExpansionHubs) {
        return null;
    }

    return (
        <section className={cn('mx-auto flex w-full max-w-7xl flex-col gap-8 px-8 py-16', className)}>
            {listed.length > 0 ? (
                <>
                    <div className="flex items-baseline justify-between gap-4">
                        <h2 className="font-serif text-2xl font-light @md:text-3xl">{title}</h2>
                        <Button asChild variant="link" className="h-auto -mx-2 px-2">
                            <CountryHubLink countryCode={seeAllCountry} label={seeAllLabel} />
                        </Button>
                    </div>
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 @sm:gap-x-6 @md:grid-cols-3 @lg:grid-cols-4 @xl:gap-x-8">
                        {listed.map((city) => (
                            <li key={city.pathName}>
                                <Link
                                    to="/{-$locale}/cities/$pathName"
                                    params={{ pathName: city.pathName }}
                                    className="text-sm/6 text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none active:text-foreground/80"
                                >
                                    {contentLocaleText(city.nameDe, city.nameEn, locale, city.nameNl)}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </>
            ) : null}
            {showExpansionHubs ? (
                <div className={cn('flex flex-col gap-4', listed.length > 0 && 'border-t border-border pt-8')}>
                    <h3 className="font-serif text-xl font-light @md:text-2xl">{t('cities.moreCountries')}</h3>
                    <ul className="flex flex-wrap gap-x-6 gap-y-3">
                        {EXPANSION_HUBS.map((hub) => (
                            <li key={hub.countryCode}>
                                <Link
                                    to="/{-$locale}/coming-to/$country"
                                    params={{ country: hub.country }}
                                    className="text-sm/6 font-medium text-foreground underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                                >
                                    {cityCountryCodeLabel(hub.countryCode, locale)}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </section>
    );
}
