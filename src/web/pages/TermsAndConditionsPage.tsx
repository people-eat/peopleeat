import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { MarkdownBody } from '../components/MarkdownBody';
import type { GqlCPublicLegalDocumentsQuery } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';

const termsAndConditionsPageTitle = { de: 'Allgemeine Geschäftsbedingungen', en: 'Terms and conditions' } as const;
export function TermsAndConditionsPage({ data }: { data: GqlCPublicLegalDocumentsQuery }) {
    const locale = useLocale();
    const bodyDe = data.publicLegal.termsAndConditions?.bodyDe;

    return (
        <>
            <Header user={data.currentSession.user} />
            <main id="main-content" className="mx-auto w-full max-w-7xl px-4 py-16 @lg:px-6">
                <h1 className="font-serif text-4xl/tight">{termsAndConditionsPageTitle[locale]}</h1>
                {bodyDe ? (
                    <div className="mt-8">
                        <MarkdownBody text={bodyDe} />
                    </div>
                ) : (
                    <p className="mt-8 text-muted-foreground">
                        {
                            {
                                de: 'Noch keine AGB veröffentlicht.',
                                en: 'No terms and conditions have been published yet.',
                            }[locale]
                        }
                    </p>
                )}
            </main>
            <Footer />
        </>
    );
}
