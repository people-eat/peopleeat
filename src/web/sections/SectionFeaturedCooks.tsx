import type { Locale } from '../../shared';
import type { PublicCookCardCook } from '../components/PublicCookCard';
import { PublicCookCard } from '../components/PublicCookCard';

export type SectionFeaturedCook = PublicCookCardCook;

export function SectionFeaturedCooks({ cooks, locale }: { cooks: ReadonlyArray<SectionFeaturedCook>; locale: Locale }) {
    if (cooks.length === 0) return null;

    return (
        <section className="mx-auto w-full max-w-7xl px-4 py-16 @lg:px-6">
            <h2 className="font-serif text-3xl font-light @md:text-4xl">{{ de: 'Unsere Köche', en: 'Our chefs' }[locale]}</h2>
            <ul className="mt-10 grid grid-cols-1 gap-4 @sm:grid-cols-2 @md:grid-cols-3 @lg:grid-cols-4">
                {cooks.map((cook) => (
                    <li key={cook.cookId}>
                        <PublicCookCard cook={cook} />
                    </li>
                ))}
            </ul>
        </section>
    );
}
