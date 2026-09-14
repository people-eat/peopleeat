import { Link } from '@tanstack/react-router';

import { contentLocaleText } from '../../shared/contentSection';
import { Button } from '../components/base/button';
import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';

export type SectionCitiesCity = {
    pathName: string;
    nameDe: string;
    nameEn: string;
};

export function SectionCities({ cities, className }: { cities: readonly SectionCitiesCity[]; className?: string }) {
    const locale = useLocale();

    if (cities.length === 0) {
        return null;
    }

    return (
        <section className={cn('mx-auto flex w-full max-w-7xl flex-col gap-8 px-8 py-16', className)}>
            <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-serif text-2xl font-light @md:text-3xl">{{ de: 'Unsere Städte', en: 'Our cities' }[locale]}</h2>
                <Button asChild variant="link" className="h-auto -mx-2 px-2">
                    <Link to="/{-$locale}/cities">{{ de: 'Alle ansehen', en: 'See all' }[locale]}</Link>
                </Button>
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-8 @sm:gap-x-6 @md:grid-cols-3 @lg:grid-cols-4 @xl:gap-x-8">
                {cities.map((city) => (
                    <li key={city.pathName}>
                        <Link
                            to="/{-$locale}/cities/$pathName"
                            params={{ pathName: city.pathName }}
                            className="text-sm/6 text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none active:text-foreground/80"
                        >
                            {contentLocaleText(city.nameDe, city.nameEn, locale)}
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}
