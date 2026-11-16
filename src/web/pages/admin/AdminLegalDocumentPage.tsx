import { Link, useNavigate } from '@tanstack/react-router';
import { ChevronRightIcon, ScaleIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { t } from '../../../i18n/t';
import { formatDate } from '../../../shared';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '../../components/base/card';
import type { GqlCAdminLegalDocumentPageAdminFragment, GqlCAdminLegalDocumentPageQuery } from '../../graphql/generated';
import { AdminLegalDocumentDraftUpsertDocument, AdminLegalDocumentPageUpdatesDocument } from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import type { Locale } from '../../utils/locale';
import type { AdminLegalKind } from './adminLegal';
import {
    adminLegalDocumentKind,
    adminLegalDraftRow,
    adminLegalDraftTo,
    adminLegalKindLabel,
    adminLegalPublishedRows,
    adminLegalRowsFromAdmin,
    adminLegalVersionTo,
} from './adminLegal';

export function adminLegalDocumentPageTitle(kind: AdminLegalKind, locale: Locale): string {
    return adminLegalKindLabel(kind, locale);
}

export function adminLegalDocumentPageDescription(kind: AdminLegalKind, locale: Locale): string {
    return t(locale, 'admin', `legal.${kind}Description`);
}

export function AdminLegalDocumentPage({ data, kind }: { data: GqlCAdminLegalDocumentPageQuery; kind: AdminLegalKind }) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate();
    const client = useClient();
    const seedAdmin = data.currentSession.user?.admin ?? null;
    const [admin, setAdmin] = useState<GqlCAdminLegalDocumentPageAdminFragment | null>(seedAdmin);
    const [busy, setBusy] = useState(false);

    const [, draftUpsert] = useMutation(AdminLegalDocumentDraftUpsertDocument);

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
            const result = await draftUpsert({
                kind: adminLegalDocumentKind(kind),
                input: { bodyDe: '', changeSummaryDe: '' },
            });
            if (result.error || !result.data?.admin.legalDocumentDraftUpsert.success) {
                toast.error(t(locale, 'admin', 'copy.couldNotCreateDraft'));
                return;
            }
            toast.success(t(locale, 'admin', 'copy.draftCreated'));
            void navigate({
                to: adminLegalDraftTo(kind),
                params: { kind },
            });
        } finally {
            setBusy(false);
        }
    }

    const title = adminLegalDocumentPageTitle(kind, locale);

    return (
        <AdminPathPageChrome>
            <main id="main-content" className="grid w-full content-start gap-8">
                <div className="grid gap-2">
                    <h1 className="flex items-center gap-3 font-serif text-4xl/tight text-foreground">
                        <ScaleIcon className="size-8 shrink-0 text-muted-foreground" aria-hidden />
                        {title}
                    </h1>
                    <p className="text-muted-foreground">{adminLegalDocumentPageDescription(kind, locale)}</p>
                </div>

                <section className="grid gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg font-medium">{t(locale, 'admin', 'copy.draft')}</h2>
                        {draft ? (
                            <Button asChild>
                                <Link to={adminLegalDraftTo(kind)} params={{ kind }}>
                                    {t(locale, 'admin', 'copy.editDraft')}
                                </Link>
                            </Button>
                        ) : (
                            <Button type="button" disabled={busy} onClick={() => void onCreateDraft()}>
                                {t(locale, 'admin', 'copy.createDraft')}
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
                                        {t(locale, 'admin', 'copy.currentDraft')}
                                        <Badge variant="secondary">{t(locale, 'admin', 'copy.draft')}</Badge>
                                    </CardTitle>
                                    <CardDescription>
                                        {draft.changeSummaryDe.trim() ? draft.changeSummaryDe : t(locale, 'admin', 'copy.noChangeSummary')}
                                    </CardDescription>
                                    <CardAction>
                                        <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden />
                                    </CardAction>
                                </CardHeader>
                            </Card>
                        </Link>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            {t(locale, 'admin', 'copy.noDraftYetCreatingOneCopiesTheBodyFromTheCurrentPublishedVer')}
                        </p>
                    )}
                </section>

                <section className="grid gap-3">
                    <h2 className="text-lg font-medium">{t(locale, 'admin', 'copy.publishedVersions')}</h2>
                    {published.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.noPublishedVersionsYet')}</p>
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
                                                            <Badge variant="outline">{t(locale, 'admin', 'copy.current')}</Badge>
                                                        ) : null}
                                                    </CardTitle>
                                                    <CardDescription>
                                                        {row.changeSummaryDe.trim()
                                                            ? row.changeSummaryDe
                                                            : t(locale, 'admin', 'copy.noChangeSummary')}
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
