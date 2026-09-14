import { ContentPageList } from '../components/ContentPageList';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import type { GqlCPublicOccasionsPageQuery } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';

const occasionsPageTitle = { de: 'Anlässe', en: 'Occasions' } as const;
const occasionsPageDescription = {
    de: 'Privatköche für jeden Anlass, von Geburtstag bis Firmenfeier.',
    en: 'Private chefs for every occasion, from birthdays to company events.',
} as const;

export function OccasionsPage({ data }: { data: GqlCPublicOccasionsPageQuery }) {
    const locale = useLocale();
    const items = data.publicOccasion.findMany;

    return (
        <>
            <Header user={data.currentSession.user} />
            <main id="main-content" className="mx-auto w-full max-w-7xl px-4 py-16 @lg:px-6">
                <h1 className="font-serif text-4xl font-light @md:text-5xl">{occasionsPageTitle[locale]}</h1>
                <p className="mt-3 max-w-2xl text-muted-foreground">{occasionsPageDescription[locale]}</p>
                <div className="mt-12">
                    <ContentPageList
                        items={items}
                        locale={locale}
                        basePath="/occasions"
                        emptyLabel={{ de: 'Noch keine Anlässe veröffentlicht.', en: 'No occasions published yet.' }[locale]}
                    />
                </div>
            </main>
            <Footer />
        </>
    );
}
