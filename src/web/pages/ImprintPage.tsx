import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { MarkdownBody } from '../components/MarkdownBody';
import type { GqlCPublicLegalDocumentsQuery } from '../graphql/generated';
import { useT } from '../hooks/useT';

export function ImprintPage({ data }: { data: GqlCPublicLegalDocumentsQuery }) {
    const { t } = useT('public');
    const bodyDe = data.publicLegal.imprint?.bodyDe;

    return (
        <>
            <Header user={data.currentSession.user} />
            <main id="main-content" className="mx-auto w-full max-w-7xl px-4 py-16 @lg:px-6">
                <h1 className="font-serif text-4xl/tight">{t('legal.imprintTitle')}</h1>
                {bodyDe ? (
                    <div className="mt-8">
                        <MarkdownBody text={bodyDe} />
                    </div>
                ) : (
                    <p className="mt-8 text-muted-foreground">{t('legal.imprintEmpty')}</p>
                )}
            </main>
            <Footer />
        </>
    );
}
