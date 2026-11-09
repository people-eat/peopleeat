import { ContentPageList } from '../components/ContentPageList';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import type { GqlCPublicVenuesPageQuery } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';

const venuesPageTitle = { de: 'Locations', en: 'Venues' } as const;
const venuesPageDescription = {
    de: 'Locations, in denen ihr einen Privatkoch buchen könnt.',
    en: 'Venues where you can book a private chef.',
} as const;

export function VenuesPage({ data }: { data: GqlCPublicVenuesPageQuery }) {
    const locale = useLocale();
    const items = data.publicPartnerVenue.findMany;

    return (
        <>
            <Header user={data.currentSession.user} />
            <main id="main-content" className="mx-auto w-full max-w-7xl px-4 py-16 @lg:px-6">
                <h1 className="font-serif text-4xl font-light @md:text-5xl">{venuesPageTitle[locale]}</h1>
                <p className="mt-3 max-w-2xl text-muted-foreground">{venuesPageDescription[locale]}</p>
                <div className="mt-12">
                    <ContentPageList
                        items={items}
                        locale={locale}
                        basePath="/venues"
                        emptyLabel={{ de: 'Noch keine Locations veröffentlicht.', en: 'No venues published yet.' }[locale]}
                    />
                </div>
            </main>
            <Footer />
        </>
    );
}
