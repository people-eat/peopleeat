import { ContentPageList } from '../components/ContentPageList';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import type { GqlCPublicPartnersPageQuery } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';

const partnersPageTitle = { de: 'Partner', en: 'Partners' } as const;
const partnersPageDescription = {
    de: 'Marken und Kooperationen mit peopleeat.',
    en: 'Brands and collaborations with peopleeat.',
} as const;

export function PartnersPage({ data }: { data: GqlCPublicPartnersPageQuery }) {
    const locale = useLocale();
    const items = data.publicPartner.findMany;

    return (
        <>
            <Header user={data.currentSession.user} showBookingRequestCta={false} />
            <main id="main-content" className="mx-auto w-full max-w-7xl px-4 py-16 @lg:px-6">
                <h1 className="font-serif text-4xl font-light @md:text-5xl">{partnersPageTitle[locale]}</h1>
                <p className="mt-3 max-w-2xl text-muted-foreground">{partnersPageDescription[locale]}</p>
                <div className="mt-12">
                    <ContentPageList
                        items={items}
                        locale={locale}
                        basePath="/partners"
                        emptyLabel={{ de: 'Noch keine Partner veröffentlicht.', en: 'No partners published yet.' }[locale]}
                    />
                </div>
            </main>
            <Footer />
        </>
    );
}
