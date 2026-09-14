import { Link, useNavigate } from '@tanstack/react-router';
import { ChevronRightIcon, ScaleIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { formatDate } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '../../components/base/card';
import type { GqlCAdminLegalDocumentPageAdminFragment, GqlCAdminLegalDocumentPageQuery } from '../../graphql/generated';
import {
    AdminLegalDocumentPageUpdatesDocument,
    AdminLegalImprintDraftCreateDocument,
    AdminLegalPrivacyPolicyDraftCreateDocument,
    AdminLegalTermsAndConditionsDraftCreateDocument,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import type { AdminLegalKind } from './adminLegal';
import {
    adminLegalDraftRow,
    adminLegalDraftTo,
    adminLegalKindLabel,
    adminLegalPublishedRows,
    adminLegalRowsFromAdmin,
    adminLegalVersionTo,
} from './adminLegal';

export function adminLegalDocumentPageTitle(kind: AdminLegalKind) {
    return {
        de: adminLegalKindLabel(kind, 'de'),
        en: adminLegalKindLabel(kind, 'en'),
    } as const;
}

export function adminLegalDocumentPageDescription(kind: AdminLegalKind) {
    return (
        {
            privacy: {
                de: 'Entwurf und veröffentlichte Versionen der Datenschutzerklärung.',
                en: 'Draft and published versions of the privacy policy.',
            },
            terms: {
                de: 'Entwurf und veröffentlichte Versionen der AGB.',
                en: 'Draft and published versions of the terms.',
            },
            imprint: {
                de: 'Entwurf und veröffentlichte Versionen des Impressums.',
                en: 'Draft and published versions of the imprint.',
            },
        } as const
    )[kind];
}

export function AdminLegalDocumentPage({ data, kind }: { data: GqlCAdminLegalDocumentPageQuery; kind: AdminLegalKind }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate();
    const client = useClient();
    const seedAdmin = data.currentSession.user?.admin ?? null;
    const [admin, setAdmin] = useState<GqlCAdminLegalDocumentPageAdminFragment | null>(seedAdmin);
    const [busy, setBusy] = useState(false);

    const [, privacyDraftCreate] = useMutation(AdminLegalPrivacyPolicyDraftCreateDocument);
    const [, termsDraftCreate] = useMutation(AdminLegalTermsAndConditionsDraftCreateDocument);
    const [, imprintDraftCreate] = useMutation(AdminLegalImprintDraftCreateDocument);

    useEffect(() => {
        if (!seedAdmin) return;
        const request = createRequest(AdminLegalDocumentPageUpdatesDocument, {});
        const operation = client.executeSubscription(request);
        const { unsubscribe } = pipe(
            operation,
            subscribe((result) => {
                const next = result.data?.adminUpdates;
                if (next) {
                    setAdmin(next);
                }
            }),
        );
        return unsubscribe;
    }, [client, seedAdmin]);

    const rows = useMemo(() => (admin ? adminLegalRowsFromAdmin(admin, kind) : []), [admin, kind]);
    const draft = adminLegalDraftRow(rows);
    const published = useMemo(() => adminLegalPublishedRows(rows), [rows]);
    const currentPublishedId = published[0]?.id ?? null;

    if (!admin) {
        return null;
    }

    async function onCreateDraft() {
        setBusy(true);
        try {
            let ok = false;
            let error = false;
            if (kind === 'privacy') {
                const result = await privacyDraftCreate({});
                error = Boolean(result.error);
                ok = Boolean(result.data?.admin.legalPrivacyPolicyDraftCreate.success);
            } else if (kind === 'terms') {
                const result = await termsDraftCreate({});
                error = Boolean(result.error);
                ok = Boolean(result.data?.admin.legalTermsAndConditionsDraftCreate.success);
            } else {
                const result = await imprintDraftCreate({});
                error = Boolean(result.error);
                ok = Boolean(result.data?.admin.legalImprintDraftCreate.success);
            }

            if (error || !ok) {
                toast.error({ de: 'Entwurf konnte nicht angelegt werden.', en: 'Could not create draft.' }[locale]);
                return;
            }
            toast.success({ de: 'Entwurf angelegt.', en: 'Draft created.' }[locale]);
            void navigate({
                to: adminLegalDraftTo(kind),
                params: { kind },
            });
        } finally {
            setBusy(false);
        }
    }

    const title = adminLegalDocumentPageTitle(kind);

    return (
        <AdminPathPageChrome>
            <main id="main-content" className="grid w-full content-start gap-8">
                <div className="grid gap-2">
                    <h1 className="flex items-center gap-3 font-serif text-4xl/tight text-foreground">
                        <ScaleIcon className="size-8 shrink-0 text-muted-foreground" aria-hidden />
                        {title[locale]}
                    </h1>
                    <p className="text-muted-foreground">{adminLegalDocumentPageDescription(kind)[locale]}</p>
                </div>

                <section className="grid gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg font-medium">{{ de: 'Entwurf', en: 'Draft' }[locale]}</h2>
                        {draft ? (
                            <Button asChild>
                                <Link to={adminLegalDraftTo(kind)} params={{ kind }}>
                                    {{ de: 'Entwurf bearbeiten', en: 'Edit draft' }[locale]}
                                </Link>
                            </Button>
                        ) : (
                            <Button type="button" disabled={busy} onClick={() => void onCreateDraft()}>
                                {{ de: 'Entwurf anlegen', en: 'Create draft' }[locale]}
                            </Button>
                        )}
                    </div>
                    {draft ? (
                        <Link
                            to={adminLegalDraftTo(kind)}
                            params={{ kind }}
                            className="block rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                            <Card className="gap-3 py-4 transition-colors hover:bg-muted/40">
                                <CardHeader className="px-4">
                                    <CardTitle className="flex flex-wrap items-center gap-2">
                                        {{ de: 'Aktueller Entwurf', en: 'Current draft' }[locale]}
                                        <Badge variant="secondary">{{ de: 'Entwurf', en: 'Draft' }[locale]}</Badge>
                                    </CardTitle>
                                    <CardDescription>
                                        {draft.changeSummaryDe.trim()
                                            ? draft.changeSummaryDe
                                            : { de: 'Keine Änderungszusammenfassung.', en: 'No change summary.' }[locale]}
                                    </CardDescription>
                                    <CardAction>
                                        <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden />
                                    </CardAction>
                                </CardHeader>
                            </Card>
                        </Link>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            {
                                {
                                    de: 'Noch kein Entwurf. Anlegen kopiert den Text der aktuellen veröffentlichten Version.',
                                    en: 'No draft yet. Creating one copies the body from the current published version.',
                                }[locale]
                            }
                        </p>
                    )}
                </section>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{{ de: 'Veröffentlichte Versionen', en: 'Published versions' }[locale]}</h2>
                    {published.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            {{ de: 'Noch keine veröffentlichten Versionen.', en: 'No published versions yet.' }[locale]}
                        </p>
                    ) : (
                        <ul className="grid gap-3">
                            {published.map((row) => {
                                const isCurrent = row.id === currentPublishedId;
                                return (
                                    <li key={row.id}>
                                        <Link
                                            to={adminLegalVersionTo(kind, row.id)}
                                            params={{ kind, versionId: row.id }}
                                            className="block rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                        >
                                            <Card className="gap-3 py-4 transition-colors hover:bg-muted/40">
                                                <CardHeader className="px-4">
                                                    <CardTitle className="flex flex-wrap items-center gap-2">
                                                        {formatDate(row.publishedAt, { locale, timeZone, dateStyle: 'medium' })}
                                                        {isCurrent ? (
                                                            <Badge variant="outline">{{ de: 'Aktuell', en: 'Current' }[locale]}</Badge>
                                                        ) : null}
                                                    </CardTitle>
                                                    <CardDescription>
                                                        {row.changeSummaryDe.trim()
                                                            ? row.changeSummaryDe
                                                            : { de: 'Keine Änderungszusammenfassung.', en: 'No change summary.' }[locale]}
                                                    </CardDescription>
                                                    <CardAction>
                                                        <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden />
                                                    </CardAction>
                                                </CardHeader>
                                            </Card>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>
            </main>
        </AdminPathPageChrome>
    );
}
