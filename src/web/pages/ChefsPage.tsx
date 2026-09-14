import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { SITE_NAME } from '../../shared/siteBranding';
import { Input } from '../components/base/input';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { PublicCookCard } from '../components/PublicCookCard';
import type { GqlCChefsPageQuery } from '../graphql/generated';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useLocale } from '../hooks/useLocale';
import { SectionChefForAnyOccasion } from '../sections/SectionChefForAnyOccasion';

const chefsPageTitle = { de: 'Köche', en: 'Chefs' } as const;
const chefsPageDescription = {
    de: 'Entdecke Privatköche für dein Dinner zu Hause.',
    en: 'Discover private chefs for dinner at home.',
} as const;

export type ChefsSearch = {
    q?: string;
};

export function parseChefsSearch(search: Record<string, unknown>): ChefsSearch {
    const q = typeof search.q === 'string' && search.q.trim().length > 0 ? search.q.trim() : undefined;
    return { q };
}

export function chefsPageVariables(search: ChefsSearch) {
    return {
        criterion: search.q ? { searchText: search.q } : undefined,
    };
}

export function ChefsPage({ data, search }: { data: GqlCChefsPageQuery; search: ChefsSearch }) {
    const locale = useLocale();
    const navigate = useNavigate({ from: '/{-$locale}/chefs' });
    const cooks = data.publicCook.findMany;

    const [draftQ, setDraftQ] = useState(search.q ?? '');
    const debouncedQ = useDebouncedValue(draftQ, 300);

    useEffect(() => {
        setDraftQ(search.q ?? '');
    }, [search.q]);

    useEffect(() => {
        const nextQ = debouncedQ.trim() || undefined;
        if (nextQ === search.q) return;
        void navigate({ search: { q: nextQ }, replace: true });
    }, [debouncedQ, navigate, search.q]);

    return (
        <div className="@container w-full min-w-0">
            <Header user={data.currentSession.user} />
            <main id="main-content">
                <SectionChefForAnyOccasion
                    locale={locale}
                    displayName={SITE_NAME}
                    headlineDe="Ein Privatkoch für jeden Anlass"
                    headlineEn="A private chef for any occasion"
                    bodyDe="Entdecke geprüfte Privatköche und buche ein unvergessliches Dinner zu Hause, für Geburtstag, Firmenfeier oder einen besonderen Abend."
                    bodyEn="Discover vetted private chefs and book an unforgettable dinner at home, for birthdays, company events, or a special evening."
                    imageUrl="/home/comparison-section/private-chef-max.jpg"
                />

                <section className="mx-auto w-full max-w-7xl px-4 pb-16 @lg:px-6">
                    <div className="flex flex-col gap-6 @sm:flex-row @sm:items-end @sm:justify-between">
                        <div>
                            <h1 className="font-serif text-3xl font-light @md:text-4xl">{chefsPageTitle[locale]}</h1>
                            <p className="mt-3 max-w-2xl text-muted-foreground">{chefsPageDescription[locale]}</p>
                        </div>
                        <Input
                            value={draftQ}
                            onChange={(event) => setDraftQ(event.target.value)}
                            placeholder={{ de: 'Köche suchen…', en: 'Search chefs…' }[locale]}
                            className="max-w-xs"
                            aria-label={{ de: 'Köche suchen', en: 'Search chefs' }[locale]}
                        />
                    </div>

                    <div className="mt-10">
                        {cooks.length === 0 ? (
                            <p className="text-muted-foreground">
                                {search.q
                                    ? { de: 'Keine Köche gefunden.', en: 'No chefs found.' }[locale]
                                    : { de: 'Noch keine Köche veröffentlicht.', en: 'No chefs published yet.' }[locale]}
                            </p>
                        ) : (
                            <ul className="grid grid-cols-1 gap-4 @sm:grid-cols-2 @md:grid-cols-3 @lg:grid-cols-4">
                                {cooks.map((cook) => (
                                    <li key={cook.cookId}>
                                        <PublicCookCard cook={cook} />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
