import { ScaleIcon } from 'lucide-react';

import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { useLocale } from '../../hooks/useLocale';
import { ADMIN_LEGAL_KINDS, adminLegalKindLabel, adminLegalKindTo } from './adminLegal';
import { AdminOverviewNavCard } from './AdminOverviewNavCard';

export const adminLegalPageTitle = { de: 'Rechtstexte', en: 'Legal texts' } as const;
export const adminLegalPageDescription = {
    de: 'Wie Datenschutz, AGB und Impressum als Versionen gespeichert und veröffentlicht werden.',
    en: 'How privacy policy, terms, and imprint are versioned and published.',
} as const;

function adminLegalKindBlurb(kind: (typeof ADMIN_LEGAL_KINDS)[number], locale: 'de' | 'en') {
    return (
        {
            privacy: {
                de: 'Entwurf und veröffentlichte Versionen verwalten. Änderungen lösen die Annahme-Pflicht aus.',
                en: 'Manage draft and published versions. Changes trigger the acceptance gate.',
            },
            terms: {
                de: 'Entwurf und veröffentlichte Versionen verwalten. Änderungen lösen die Annahme-Pflicht aus.',
                en: 'Manage draft and published versions. Changes trigger the acceptance gate.',
            },
            imprint: {
                de: 'Entwurf und veröffentlichte Versionen verwalten. Gehört nicht zur Annahme-Pflicht.',
                en: 'Manage draft and published versions. Not part of the acceptance gate.',
            },
        } as const
    )[kind][locale];
}

export function AdminLegalPage() {
    const locale = useLocale();

    return (
        <AdminPathPageChrome>
            <main id="main-content" className="grid w-full content-start gap-8">
                <div className="grid max-w-3xl gap-2">
                    <h1 className="flex items-center gap-3 font-serif text-4xl/tight text-foreground">
                        <ScaleIcon className="size-8 text-muted-foreground" aria-hidden />
                        {adminLegalPageTitle[locale]}
                    </h1>
                    <p className="text-muted-foreground">{adminLegalPageDescription[locale]}</p>
                </div>

                <section className="grid max-w-3xl gap-3 text-sm/relaxed text-foreground">
                    <p>
                        {
                            {
                                de: 'Jedes Dokument hat genau einen Entwurf und beliebig viele veröffentlichte Versionen. Beim Anlegen eines Entwurfs wird der Text der aktuellen veröffentlichten Version übernommen. Speichere Markdown (DE) mit einer Änderungszusammenfassung und veröffentliche, wenn der Text fertig ist.',
                                en: 'Each document has one draft and any number of published versions. Creating a draft copies the body from the current published version. Save Markdown (DE) with a change summary, and publish when the text is ready.',
                            }[locale]
                        }
                    </p>
                    <p>
                        {
                            {
                                de: 'Nach der Veröffentlichung ist eine Version unveränderlich. Wenn Datenschutz oder AGB neu veröffentlicht werden, müssen angemeldete Nutzer die aktuellen Texte erneut bestätigen. Das Impressum gehört nicht zur Annahme-Pflicht.',
                                en: 'After publishing, a version is immutable. When privacy or terms are published again, signed-in users must re-confirm the current texts. Imprint is not part of the acceptance gate.',
                            }[locale]
                        }
                    </p>
                </section>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{{ de: 'Dokumente', en: 'Documents' }[locale]}</h2>
                    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {ADMIN_LEGAL_KINDS.map((kind) => (
                            <li key={kind}>
                                <AdminOverviewNavCard
                                    to={adminLegalKindTo(kind)}
                                    params={{ kind }}
                                    description={adminLegalKindBlurb(kind, locale)}
                                >
                                    {adminLegalKindLabel(kind, locale)}
                                </AdminOverviewNavCard>
                            </li>
                        ))}
                    </ul>
                </section>
            </main>
        </AdminPathPageChrome>
    );
}
