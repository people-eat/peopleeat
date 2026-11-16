import { ScaleIcon } from 'lucide-react';

import { t } from '../../../i18n/t';
import { inlineCopy } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { useLocale } from '../../hooks/useLocale';
import type { Locale } from '../../utils/locale';
import { ADMIN_LEGAL_KINDS, adminLegalKindLabel, adminLegalKindTo } from './adminLegal';
import { AdminOverviewNavCard } from './AdminOverviewNavCard';

export function adminLegalPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'nav.legal.title');
}
export function adminLegalPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.legal.description');
}

function adminLegalKindBlurb(kind: (typeof ADMIN_LEGAL_KINDS)[number], locale: Locale) {
    return inlineCopy(
        (
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
        )[kind],
        locale,
    );
}

export function AdminLegalPage() {
    const locale = useLocale();

    return (
        <AdminPathPageChrome>
            <main id="main-content" className="grid w-full content-start gap-8">
                <div className="grid max-w-3xl gap-2">
                    <h1 className="flex items-center gap-3 font-serif text-4xl/tight text-foreground">
                        <ScaleIcon className="size-8 text-muted-foreground" aria-hidden />
                        {adminLegalPageTitle(locale)}
                    </h1>
                    <p className="text-muted-foreground">{adminLegalPageDescription(locale)}</p>
                </div>

                <section className="grid max-w-3xl gap-3 text-sm/relaxed text-foreground">
                    <p>{t(locale, 'admin', 'copy.eachDocumentHasOneDraftAndAnyNumberOfPublishedVersionsCreati')}</p>
                    <p>{t(locale, 'admin', 'copy.afterPublishingAVersionIsImmutableWhenPrivacyOrTermsArePubli')}</p>
                </section>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{t(locale, 'admin', 'copy.documents')}</h2>
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
