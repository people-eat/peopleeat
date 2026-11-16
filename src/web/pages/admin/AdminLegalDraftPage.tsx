import { useNavigate } from '@tanstack/react-router';
import { ScaleIcon } from 'lucide-react';
import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { t } from '../../../i18n/t';
import { legalBodyDeNormalize } from '../../../shared/legalBodyDeNormalize';
import { AdminPathPageChrome } from '../../components/AdminPageChrome';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../../components/base/alert-dialog';
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { Tabs, TabsList, TabsTrigger } from '../../components/base/tabs';
import { Textarea } from '../../components/base/textarea';
import { MarkdownBody } from '../../components/MarkdownBody';
import type { GqlCAdminLegalDocumentPageAdminFragment, GqlCAdminLegalDocumentPageQuery } from '../../graphql/generated';
import {
    AdminLegalDocumentDraftUpsertDocument,
    AdminLegalDocumentPageUpdatesDocument,
    AdminLegalDocumentPublishDocument,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { cn } from '../../utils/cn';
import type { Locale } from '../../utils/locale';
import type { AdminLegalKind } from './adminLegal';
import {
    adminLegalDocumentKind,
    adminLegalDraftRow,
    adminLegalKindLabel,
    adminLegalKindTo,
    adminLegalPublishedRows,
    adminLegalRowsFromAdmin,
    adminLegalVersionTo,
} from './adminLegal';
import { AdminLegalDraftDiff } from './AdminLegalDraftDiff';

export function adminLegalDraftPageTitle(kind: AdminLegalKind, locale: Locale): string {
    return t(locale, 'admin', 'legal.draftTitle', { kind: adminLegalKindLabel(kind, locale) });
}

export function adminLegalDraftPageDescription(kind: AdminLegalKind, locale: Locale): string {
    return t(locale, 'admin', `legal.${kind}DraftDescription`);
}

export function AdminLegalDraftPage({ data, kind }: { data: GqlCAdminLegalDocumentPageQuery; kind: AdminLegalKind }) {
    const locale = useLocale();
    const navigate = useNavigate();
    const client = useClient();
    const seedAdmin = data.currentSession.user?.admin ?? null;
    const [admin, setAdmin] = useState<GqlCAdminLegalDocumentPageAdminFragment | null>(seedAdmin);
    const [bodyDe, setBodyDe] = useState(() => {
        if (!seedAdmin) return '';
        return adminLegalDraftRow(adminLegalRowsFromAdmin(seedAdmin, kind))?.bodyDe ?? '';
    });
    const [changeSummaryDe, setChangeSummaryDe] = useState(() => {
        if (!seedAdmin) return '';
        return adminLegalDraftRow(adminLegalRowsFromAdmin(seedAdmin, kind))?.changeSummaryDe ?? '';
    });
    const [busy, setBusy] = useState(false);
    const [publishOpen, setPublishOpen] = useState(false);
    const [mobileSurface, setMobileSurface] = useState<'edit' | 'preview'>('edit');
    const [previewMode, setPreviewMode] = useState<'preview' | 'changes'>('preview');

    const [, draftUpsert] = useMutation(AdminLegalDocumentDraftUpsertDocument);
    const [, documentPublish] = useMutation(AdminLegalDocumentPublishDocument);

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
    const currentPublished = useMemo(() => adminLegalPublishedRows(rows)[0] ?? null, [rows]);
    const dirty = bodyDe !== (draft?.bodyDe ?? '') || changeSummaryDe !== (draft?.changeSummaryDe ?? '');
    const canSave = dirty && bodyDe.trim().length > 0;
    const canPublish = Boolean(draft) && !dirty && bodyDe.trim().length > 0 && changeSummaryDe.trim().length > 0;
    const draftId = draft?.id ?? null;
    const draftBodyDe = draft?.bodyDe;
    const draftChangeSummaryDe = draft?.changeSummaryDe;

    useEffect(() => {
        if (!admin) return;
        if (draftId !== null) return;
        void navigate({
            to: adminLegalKindTo(kind),
            params: { kind },
            replace: true,
        });
    }, [admin, draftId, kind, navigate]);

    useEffect(() => {
        if (draftId === null || dirty) return;
        setBodyDe(draftBodyDe ?? '');
        setChangeSummaryDe(draftChangeSummaryDe ?? '');
    }, [draftId, draftBodyDe, draftChangeSummaryDe, dirty]);

    const onSaveDraft = useEffectEvent(async () => {
        if (!canSave) return;
        setBusy(true);
        try {
            const result = await draftUpsert({
                kind: adminLegalDocumentKind(kind),
                input: { bodyDe, changeSummaryDe },
            });
            if (result.error || !result.data?.admin.legalDocumentDraftUpsert.success) {
                toast.error(t(locale, 'admin', 'copy.couldNotSaveDraft'));
                return;
            }
            setBodyDe(legalBodyDeNormalize(bodyDe));
            setChangeSummaryDe(changeSummaryDe.trim());
            toast.success(t(locale, 'admin', 'copy.draftSaved'));
        } finally {
            setBusy(false);
        }
    });

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 's') return;
            event.preventDefault();
            if (!busy && canSave) void onSaveDraft();
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [busy, canSave]);

    if (!admin || !draft) {
        return null;
    }

    async function onPublish() {
        if (!draft || !canPublish) return;
        setBusy(true);
        try {
            const result = await documentPublish({
                kind: adminLegalDocumentKind(kind),
                documentId: draft.id,
            });
            if (result.error || !result.data?.admin.legalDocumentPublish.success) {
                toast.error(t(locale, 'admin', 'copy.publishFailed'));
                return;
            }
            toast.success(t(locale, 'admin', 'copy.published'));
            setPublishOpen(false);
            void navigate({
                to: adminLegalVersionTo(kind, draft.id),
                params: { kind, versionId: draft.id },
            });
        } finally {
            setBusy(false);
        }
    }

    const title = adminLegalDraftPageTitle(kind, locale);

    return (
        <AdminPathPageChrome>
            <main id="main-content" className="grid w-full content-start gap-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="grid min-w-0 gap-2">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="flex items-center gap-3 font-serif text-4xl/tight text-foreground">
                                <ScaleIcon className="size-8 shrink-0 text-muted-foreground" aria-hidden />
                                {title}
                            </h1>
                            {dirty ? (
                                <Badge variant="outline">{t(locale, 'admin', 'copy.unsaved')}</Badge>
                            ) : (
                                <Badge variant="secondary">{t(locale, 'admin', 'copy.draft')}</Badge>
                            )}
                        </div>
                        <p className="text-muted-foreground">{adminLegalDraftPageDescription(kind, locale)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" disabled={busy || !canSave} onClick={() => void onSaveDraft()}>
                            {t(locale, 'admin', 'copy.saveDraft')}
                        </Button>
                        <Button type="button" variant="secondary" disabled={busy || !canPublish} onClick={() => setPublishOpen(true)}>
                            {t(locale, 'admin', 'copy.publish')}
                        </Button>
                    </div>
                </div>

                <div className="grid gap-2">
                    <label htmlFor="legal-summary" className="text-sm font-medium">
                        {t(locale, 'admin', 'copy.changeSummaryDe')}
                    </label>
                    <Textarea
                        id="legal-summary"
                        value={changeSummaryDe}
                        onChange={(event) => setChangeSummaryDe(event.target.value)}
                        rows={2}
                        className="min-h-0 field-sizing-fixed resize-y"
                    />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Tabs
                        value={mobileSurface}
                        onValueChange={(value) => setMobileSurface(value as 'edit' | 'preview')}
                        className="lg:hidden"
                    >
                        <TabsList aria-label={t(locale, 'admin', 'copy.editorView')}>
                            <TabsTrigger value="edit">{t(locale, 'admin', 'copy.edit')}</TabsTrigger>
                            <TabsTrigger value="preview">{t(locale, 'admin', 'copy.preview')}</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <p className="hidden text-xs text-muted-foreground sm:block">{t(locale, 'admin', 'copy.markdownDeCtrlSToSave')}</p>
                </div>

                <section className="grid min-h-[min(70vh,44rem)] overflow-hidden rounded-lg border border-border/60 lg:grid-cols-2">
                    <div
                        className={cn(
                            'grid min-h-0 grid-rows-[auto_1fr] border-border/60 lg:border-r',
                            mobileSurface !== 'edit' && 'max-lg:hidden',
                        )}
                    >
                        <div className="flex h-11 items-center border-b border-border/60 px-4 text-sm font-medium text-muted-foreground">
                            {t(locale, 'admin', 'copy.markdown')}
                        </div>
                        <Textarea
                            id="legal-body"
                            aria-label={t(locale, 'admin', 'copy.markdownDe')}
                            value={bodyDe}
                            onChange={(event) => setBodyDe(event.target.value)}
                            className="h-full min-h-80 field-sizing-fixed resize-none rounded-none border-0 bg-transparent font-mono text-sm shadow-none focus-visible:ring-0"
                        />
                    </div>
                    <div className={cn('grid min-h-0 grid-rows-[auto_1fr]', mobileSurface !== 'preview' && 'max-lg:hidden')}>
                        <div className="flex h-11 items-center border-b border-border/60 px-4">
                            <Tabs value={previewMode} onValueChange={(value) => setPreviewMode(value as 'preview' | 'changes')}>
                                <TabsList className="h-8" aria-label={t(locale, 'admin', 'copy.previewMode')}>
                                    <TabsTrigger value="preview" className="px-2.5 text-sm">
                                        {t(locale, 'admin', 'copy.preview')}
                                    </TabsTrigger>
                                    <TabsTrigger value="changes" className="px-2.5 text-sm">
                                        {t(locale, 'admin', 'copy.changes')}
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                        <div className="min-h-80 overflow-auto p-4">
                            {previewMode === 'preview' ? (
                                bodyDe.trim() ? (
                                    <MarkdownBody text={bodyDe} />
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        {t(locale, 'admin', 'copy.noTextYetPreviewAppearsAsYouType')}
                                    </p>
                                )
                            ) : (
                                <AdminLegalDraftDiff baseline={currentPublished?.bodyDe ?? null} next={bodyDe} />
                            )}
                        </div>
                    </div>
                </section>

                <AlertDialog open={publishOpen} onOpenChange={setPublishOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t(locale, 'admin', 'copy.publishThisVersion')}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {t(locale, 'admin', 'copy.afterPublishingThisVersionIsImmutableUsersMustReConfirmPriva')}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{t(locale, 'admin', 'copy.cancel')}</AlertDialogCancel>
                            <AlertDialogAction disabled={busy} onClick={() => void onPublish()}>
                                {t(locale, 'admin', 'copy.publish')}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </main>
        </AdminPathPageChrome>
    );
}
