import { ContentPageList } from '../components/ContentPageList';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import type { GqlCPublicOccasionsPageQuery } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { useT } from '../hooks/useT';

export function OccasionsPage({ data }: { data: GqlCPublicOccasionsPageQuery }) {
    const locale = useLocale();
    const { t } = useT('public');
    const items = data.publicOccasion.findMany;

    return (
        <>
            <Header user={data.currentSession.user} />
            <main id="main-content" className="mx-auto w-full max-w-7xl px-4 py-16 @lg:px-6">
                <h1 className="font-serif text-4xl font-light @md:text-5xl">{t('occasions.title')}</h1>
                <p className="mt-3 max-w-2xl text-muted-foreground">{t('occasions.description')}</p>
                <div className="mt-12">
                    <ContentPageList items={items} locale={locale} basePath="/occasions" emptyLabel={t('m.noOccasionsPublishedYet')} />
                </div>
            </main>
            <Footer />
        </>
    );
}
