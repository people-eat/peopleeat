import { ContentPageList } from '../components/ContentPageList';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import type { GqlCPublicCitiesPageQuery } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';

const citiesPageTitle = { de: 'Unsere Städte', en: 'Our Cities' } as const;
const citiesPageDescription = {
    de: 'Finde Privatköche in deiner Stadt.',
    en: 'Find private chefs in your city.',
} as const;

export function CitiesPage({ data }: { data: GqlCPublicCitiesPageQuery }) {
    const locale = useLocale();
    const items = data.publicCity.findMany;

    return (
        <>
            <Header user={data.currentSession.user} />
            <main id="main-content" className="mx-auto w-full max-w-7xl px-4 py-16 @lg:px-6">
                <h1 className="font-serif text-4xl font-light @md:text-5xl">{citiesPageTitle[locale]}</h1>
                <p className="mt-3 max-w-2xl text-muted-foreground">{citiesPageDescription[locale]}</p>
                <div className="mt-12">
                    <ContentPageList
                        items={items}
                        locale={locale}
                        basePath="/cities"
                        emptyLabel={{ de: 'Noch keine Städte veröffentlicht.', en: 'No cities published yet.' }[locale]}
                        showHeroImage={false}
                    />
                </div>
            </main>
            <Footer />
        </>
    );
}
