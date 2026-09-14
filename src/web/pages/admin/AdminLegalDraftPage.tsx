import { useNavigate } from '@tanstack/react-router';
import { ScaleIcon } from 'lucide-react';
import { useEffect, useEffectEvent, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

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
    AdminLegalDocumentPageUpdatesDocument,
    AdminLegalImprintDraftUpdateDocument,
    AdminLegalImprintPublishDocument,
    AdminLegalPrivacyPolicyDraftUpdateDocument,
    AdminLegalPrivacyPolicyPublishDocument,
    AdminLegalTermsAndConditionsDraftUpdateDocument,
    AdminLegalTermsAndConditionsPublishDocument,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { cn } from '../../utils/cn';
import type { AdminLegalKind } from './adminLegal';
import {
    adminLegalDraftRow,
    adminLegalKindLabel,
    adminLegalKindTo,
    adminLegalPublishedRows,
    adminLegalRowsFromAdmin,
    adminLegalVersionTo,
} from './adminLegal';
import { AdminLegalDraftDiff } from './AdminLegalDraftDiff';

export function adminLegalDraftPageTitle(kind: AdminLegalKind) {
    return {
        de: `${adminLegalKindLabel(kind, 'de')} · Entwurf`,
        en: `${adminLegalKindLabel(kind, 'en')} · Draft`,
    } as const;
}

export function adminLegalDraftPageDescription(kind: AdminLegalKind) {
    return (
        {
            privacy: {
                de: 'Datenschutz-Entwurf speichern und veröffentlichen.',
                en: 'Save and publish the privacy policy draft.',
            },
            terms: {
                de: 'AGB-Entwurf speichern und veröffentlichen.',
                en: 'Save and publish the terms draft.',
            },
            imprint: {
                de: 'Impressum-Entwurf speichern und veröffentlichen.',
                en: 'Save and publish the imprint draft.',
            },
        } as const
    )[kind];
}

export function AdminLegalDraftPage({ data, kind }: { data: GqlCAdminLegalDocumentPageQuery; kind: AdminLegalKind }) {
    const locale = useLocale();
    const navigate = useNavigate();
    const client = useClient();
    const seedAdmin = data.currentSession.user?.admin ?? null;
    const [admin, setAdmin] = useState<GqlCAdminLegalDocumentPageAdminFragment | null>(seedAdmin);

    const [bodyDe, setBodyDe] = useState('');
    const [changeSummaryDe, setChangeSummaryDe] = useState('');
    const [busy, setBusy] = useState(false);
    const [publishOpen, setPublishOpen] = useState(false);
    const [mobileSurface, setMobileSurface] = useState<'edit' | 'preview'>('edit');
    const [previewMode, setPreviewMode] = useState<'preview' | 'changes'>('preview');

    const [, privacyDraftUpdate] = useMutation(AdminLegalPrivacyPolicyDraftUpdateDocument);
    const [, privacyPublish] = useMutation(AdminLegalPrivacyPolicyPublishDocument);
    const [, termsDraftUpdate] = useMutation(AdminLegalTermsAndConditionsDraftUpdateDocument);
    const [, termsPublish] = useMutation(AdminLegalTermsAndConditionsPublishDocument);
    const [, imprintDraftUpdate] = useMutation(AdminLegalImprintDraftUpdateDocument);
    const [, imprintPublish] = useMutation(AdminLegalImprintPublishDocument);

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
        if (draftId === null) {
            void navigate({
                to: adminLegalKindTo(kind),
                params: { kind },
                replace: true,
            });
            return;
        }
        setBodyDe(draftBodyDe ?? '');
        setChangeSummaryDe(draftChangeSummaryDe ?? '');
    }, [admin, kind, draftId, draftBodyDe, draftChangeSummaryDe, navigate]);

    const onSaveDraft = useEffectEvent(async () => {
        if (!canSave) return;
        setBusy(true);
        try {
            const input = { bodyDe, changeSummaryDe };
            let ok = false;
            let error = false;
            if (kind === 'privacy') {
                const result = await privacyDraftUpdate({ input });
                error = Boolean(result.error);
                ok = Boolean(result.data?.admin.legalPrivacyPolicyDraftUpdate.success);
            } else if (kind === 'terms') {
                const result = await termsDraftUpdate({ input });
                error = Boolean(result.error);
                ok = Boolean(result.data?.admin.legalTermsAndConditionsDraftUpdate.success);
            } else {
                const result = await imprintDraftUpdate({ input });
                error = Boolean(result.error);
                ok = Boolean(result.data?.admin.legalImprintDraftUpdate.success);
            }

            if (error || !ok) {
                toast.error({ de: 'Entwurf konnte nicht gespeichert werden.', en: 'Could not save draft.' }[locale]);
                return;
            }
            toast.success({ de: 'Entwurf gespeichert.', en: 'Draft saved.' }[locale]);
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
    }, [busy, canSave, onSaveDraft]);

    if (!admin || !draft) {
        return null;
    }

    async function onPublish() {
        if (!draft || !canPublish) return;
        setBusy(true);
        try {
            let ok = false;
            let error = false;
            if (kind === 'privacy') {
                const result = await privacyPublish({ privacyPolicyId: draft.id });
                error = Boolean(result.error);
                ok = Boolean(result.data?.admin.legalPrivacyPolicyPublish.success);
            } else if (kind === 'terms') {
                const result = await termsPublish({ termsAndConditionsId: draft.id });
                error = Boolean(result.error);
                ok = Boolean(result.data?.admin.legalTermsAndConditionsPublish.success);
            } else {
                const result = await imprintPublish({ imprintId: draft.id });
                error = Boolean(result.error);
                ok = Boolean(result.data?.admin.legalImprintPublish.success);
            }

            if (error || !ok) {
                toast.error({ de: 'Veröffentlichung fehlgeschlagen.', en: 'Publish failed.' }[locale]);
                return;
            }
            toast.success({ de: 'Veröffentlicht.', en: 'Published.' }[locale]);
            setPublishOpen(false);
            void navigate({
                to: adminLegalVersionTo(kind, draft.id),
                params: { kind, versionId: draft.id },
            });
        } finally {
            setBusy(false);
        }
    }

    const title = adminLegalDraftPageTitle(kind);

    return (
        <AdminPathPageChrome>
            <main id="main-content" className="grid w-full content-start gap-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="grid min-w-0 gap-2">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="flex items-center gap-3 font-serif text-4xl/tight text-foreground">
                                <ScaleIcon className="size-8 shrink-0 text-muted-foreground" aria-hidden />
                                {title[locale]}
                            </h1>
                            {dirty ? (
                                <Badge variant="outline">{{ de: 'Nicht gespeichert', en: 'Unsaved' }[locale]}</Badge>
                            ) : (
                                <Badge variant="secondary">{{ de: 'Entwurf', en: 'Draft' }[locale]}</Badge>
                            )}
                        </div>
                        <p className="text-muted-foreground">{adminLegalDraftPageDescription(kind)[locale]}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" disabled={busy || !canSave} onClick={() => void onSaveDraft()}>
                            {{ de: 'Entwurf speichern', en: 'Save draft' }[locale]}
                        </Button>
                        <Button type="button" variant="secondary" disabled={busy || !canPublish} onClick={() => setPublishOpen(true)}>
                            {{ de: 'Veröffentlichen', en: 'Publish' }[locale]}
                        </Button>
                    </div>
                </div>

                <div className="grid gap-2">
                    <label htmlFor="legal-summary" className="text-sm font-medium">
                        {{ de: 'Änderungszusammenfassung (DE)', en: 'Change summary (DE)' }[locale]}
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
                        <TabsList aria-label={{ de: 'Editor-Ansicht', en: 'Editor view' }[locale]}>
                            <TabsTrigger value="edit">{{ de: 'Bearbeiten', en: 'Edit' }[locale]}</TabsTrigger>
                            <TabsTrigger value="preview">{{ de: 'Vorschau', en: 'Preview' }[locale]}</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <p className="hidden text-xs text-muted-foreground sm:block">
                        {{ de: 'Markdown (DE) · ⌘/Ctrl+S speichert', en: 'Markdown (DE) · ⌘/Ctrl+S to save' }[locale]}
                    </p>
                </div>

                <section className="grid min-h-[min(70vh,44rem)] overflow-hidden rounded-lg border border-border/60 lg:grid-cols-2">
                    <div
                        className={cn(
                            'grid min-h-0 grid-rows-[auto_1fr] border-border/60 lg:border-r',
                            mobileSurface !== 'edit' && 'max-lg:hidden',
                        )}
                    >
                        <div className="flex h-11 items-center border-b border-border/60 px-4 text-sm font-medium text-muted-foreground">
                            {{ de: 'Markdown', en: 'Markdown' }[locale]}
                        </div>
                        <Textarea
                            id="legal-body"
                            aria-label={{ de: 'Markdown (DE)', en: 'Markdown (DE)' }[locale]}
                            value={bodyDe}
                            onChange={(event) => setBodyDe(event.target.value)}
                            className="h-full min-h-80 field-sizing-fixed resize-none rounded-none border-0 bg-transparent font-mono text-sm shadow-none focus-visible:ring-0"
                        />
                    </div>
                    <div className={cn('grid min-h-0 grid-rows-[auto_1fr]', mobileSurface !== 'preview' && 'max-lg:hidden')}>
                        <div className="flex h-11 items-center border-b border-border/60 px-4">
                            <Tabs value={previewMode} onValueChange={(value) => setPreviewMode(value as 'preview' | 'changes')}>
                                <TabsList className="h-8" aria-label={{ de: 'Vorschau-Modus', en: 'Preview mode' }[locale]}>
                                    <TabsTrigger value="preview" className="px-2.5 text-sm">
                                        {{ de: 'Vorschau', en: 'Preview' }[locale]}
                                    </TabsTrigger>
                                    <TabsTrigger value="changes" className="px-2.5 text-sm">
                                        {{ de: 'Änderungen', en: 'Changes' }[locale]}
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
                                        {
                                            {
                                                de: 'Noch kein Text. Vorschau erscheint beim Tippen.',
                                                en: 'No text yet. Preview appears as you type.',
                                            }[locale]
                                        }
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
                            <AlertDialogTitle>{{ de: 'Version veröffentlichen?', en: 'Publish this version?' }[locale]}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {
                                    {
                                        de: 'Nach der Veröffentlichung ist diese Version unveränderlich. Nutzer müssen Datenschutz und AGB erneut bestätigen, wenn sich diese Dokumente geändert haben.',
                                        en: 'After publishing, this version is immutable. Users must re-confirm privacy and terms when those documents change.',
                                    }[locale]
                                }
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                            <AlertDialogAction disabled={busy} onClick={() => void onPublish()}>
                                {{ de: 'Veröffentlichen', en: 'Publish' }[locale]}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </main>
        </AdminPathPageChrome>
    );
}
