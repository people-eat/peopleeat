import { Link, useNavigate } from '@tanstack/react-router';
import { MoreHorizontalIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import type { ContentSection, Locale } from '../../shared';
import { fileUploadPublicUrl, pathNameSlugify } from '../../shared/contentSection';
import { uploadErrorMessage, uploadFile } from '../chat/fileUpload';
import { useContentPageEditorPreviewSync } from '../hooks/useContentPageEditorPreviewSync';
import { cn } from '../utils/cn';
import { DATE_FNS_LOCALE } from '../utils/dateFnsLocale';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from './base/alert-dialog';
import { Button } from './base/button';
import { Card, CardContent, CardHeader, CardTitle } from './base/card';
import { DatePicker } from './base/date-picker';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './base/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './base/dropdown-menu';
import { Input } from './base/input';
import { Tabs, TabsList, TabsTrigger } from './base/tabs';
import { Textarea } from './base/textarea';
import { ContentPageView } from './ContentPageView';
import type { ContentPageViewModel } from './ContentPageView';
import { ContentSectionsEditor } from './ContentSectionsEditor';
import type { PublicHeaderUser } from './Header';

export type ContentPageEditorValues = {
    pathName: string;
    titleDe: string;
    titleEn: string;
    descriptionDe: string;
    descriptionEn: string;
    headlineDe: string;
    headlineEn: string;
    subHeadlineDe: string;
    subHeadlineEn: string;
    heroImageFileUploadId: string | null;
    sections: ContentSection[];
    publishedAt: string | null;
};

export type ContentPageEditorTab = 'edit' | 'preview';

export type ContentPageEditorSearch = {
    tab?: ContentPageEditorTab;
};

export function parseContentPageEditorSearch(search: Record<string, unknown>): ContentPageEditorSearch {
    const tab = search.tab === 'preview' ? 'preview' : search.tab === 'edit' ? 'edit' : undefined;
    return { tab };
}

export function contentPageEditorTabFromSearch(search: ContentPageEditorSearch): ContentPageEditorTab {
    return search.tab === 'preview' ? 'preview' : 'edit';
}

type ContentPageEditorDetail =
    | { to: '/{-$locale}/admin/cities/$cityId'; params: { cityId: string } }
    | { to: '/{-$locale}/admin/partners/$partnerId'; params: { partnerId: string } }
    | { to: '/{-$locale}/admin/occasions/$occasionId'; params: { occasionId: string } }
    | { to: '/{-$locale}/admin/blog-posts/$blogPostId'; params: { blogPostId: string } };

type ContentPageEditorListTo =
    '/{-$locale}/admin/cities' | '/{-$locale}/admin/partners' | '/{-$locale}/admin/occasions' | '/{-$locale}/admin/blog-posts';

type ContentPagePublicDetail =
    | { to: '/{-$locale}/cities/$pathName'; params: { pathName: string } }
    | { to: '/{-$locale}/partners/$pathName'; params: { pathName: string } }
    | { to: '/{-$locale}/occasions/$pathName'; params: { pathName: string } }
    | { to: '/{-$locale}/blog-posts/$pathName'; params: { pathName: string } };

function contentPagePublicDetail(listTo: ContentPageEditorListTo, pathName: string): ContentPagePublicDetail {
    if (listTo === '/{-$locale}/admin/cities') {
        return { to: '/{-$locale}/cities/$pathName', params: { pathName } };
    }
    if (listTo === '/{-$locale}/admin/partners') {
        return { to: '/{-$locale}/partners/$pathName', params: { pathName } };
    }
    if (listTo === '/{-$locale}/admin/occasions') {
        return { to: '/{-$locale}/occasions/$pathName', params: { pathName } };
    }
    return { to: '/{-$locale}/blog-posts/$pathName', params: { pathName } };
}

type PublishStatus = 'draft' | 'published' | 'scheduled';

function publishStatusFrom(publishedAt: string | null, now = new Date()): PublishStatus {
    if (!publishedAt) return 'draft';
    return new Date(publishedAt) > now ? 'scheduled' : 'published';
}

function startOfLocalDayIso(date: Date): string {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
}

function publishedAtToDate(publishedAt: string | null): Date | undefined {
    if (!publishedAt) return undefined;
    const date = new Date(publishedAt);
    return Number.isNaN(date.getTime()) ? undefined : date;
}

export function ContentPageEditor({
    uiLocale,
    values,
    onChange,
    onSave,
    onDelete,
    busy,
    identityFields,
    extraFields,
    listTo,
    detail,
    tab,
    user,
    featuredCooks,
    chefForAnyOccasion,
    formatsSection,
    heroImageFallbackUrl,
    heroVariant = 'fullBleed',
    howItWorks,
    cities,
    knownFrom,
}: {
    uiLocale: Locale;
    values: ContentPageEditorValues;
    /** Partial merge — callers must apply with functional setState so async uploads cannot clobber newer edits. */
    onChange: (partial: Partial<ContentPageEditorValues>) => void;
    onSave: (values: ContentPageEditorValues) => Promise<void>;
    onDelete?: () => Promise<void>;
    busy: boolean;
    /** Entity identity (name, geo, …) — rendered after SEO, before Hero. */
    identityFields?: React.ReactNode;
    /** Page-body extras (first section, cooks, testimonials, …) — after Hero, before configurable sections. */
    extraFields?: React.ReactNode;
    listTo: ContentPageEditorListTo;
    detail: ContentPageEditorDetail;
    tab: ContentPageEditorTab;
    user: PublicHeaderUser;
    featuredCooks?: ContentPageViewModel['featuredCooks'];
    chefForAnyOccasion?: ContentPageViewModel['chefForAnyOccasion'];
    formatsSection?: ContentPageViewModel['formatsSection'];
    heroImageFallbackUrl?: ContentPageViewModel['heroImageFallbackUrl'];
    /** `article` = blog title / lead / rounded image preview (still edits the shared Hero fields). */
    heroVariant?: ContentPageViewModel['heroVariant'];
    howItWorks?: ContentPageViewModel['howItWorks'];
    cities?: ContentPageViewModel['cities'];
    knownFrom?: ContentPageViewModel['knownFrom'];
}) {
    const navigate = useNavigate();
    const [editLocale, setEditLocale] = useState<Locale>('de');
    const [confirm, setConfirm] = useState<'publish' | 'unpublish' | 'delete' | null>(null);
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
    const editorColumnRef = useRef<HTMLDivElement>(null);
    const previewScrollRef = useRef<HTMLDivElement>(null);
    const status = publishStatusFrom(values.publishedAt);
    const publicDetail = values.pathName.trim() ? contentPagePublicDetail(listTo, values.pathName.trim()) : null;

    useContentPageEditorPreviewSync({
        editorColumnRef,
        previewScrollRef,
        enabled: tab === 'edit',
    });

    function patch(partial: Partial<ContentPageEditorValues>) {
        onChange(partial);
    }

    async function saveWith(next: ContentPageEditorValues) {
        onChange({ publishedAt: next.publishedAt });
        try {
            await onSave(next);
            toast.success({ de: 'Gespeichert', en: 'Saved' }[uiLocale]);
        } catch {
            toast.error({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }[uiLocale]);
            throw new Error('save failed');
        }
    }

    async function handleSave() {
        try {
            await onSave(values);
            toast.success({ de: 'Gespeichert', en: 'Saved' }[uiLocale]);
        } catch {
            toast.error({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }[uiLocale]);
        }
    }

    async function confirmPublish() {
        try {
            await saveWith({ ...values, publishedAt: new Date().toISOString() });
            setConfirm(null);
        } catch {
            // toast already shown
        }
    }

    async function confirmUnpublish() {
        try {
            await saveWith({ ...values, publishedAt: null });
            setConfirm(null);
        } catch {
            // toast already shown
        }
    }

    async function confirmSchedule() {
        if (!scheduleDate) return;
        try {
            await saveWith({ ...values, publishedAt: startOfLocalDayIso(scheduleDate) });
            setScheduleOpen(false);
        } catch {
            // toast already shown
        }
    }

    async function confirmDelete() {
        if (!onDelete) return;
        try {
            await onDelete();
            toast.success({ de: 'Gelöscht', en: 'Deleted' }[uiLocale]);
            setConfirm(null);
            await navigate({ to: listTo });
        } catch {
            toast.error({ de: 'Löschen fehlgeschlagen.', en: 'Could not delete.' }[uiLocale]);
        }
    }

    const statusLabel = {
        draft: { de: 'Entwurf', en: 'Draft' },
        published: { de: 'Veröffentlicht', en: 'Published' },
        scheduled: { de: 'Geplant', en: 'Scheduled' },
    }[status][uiLocale];

    const pageView = (
        <ContentPageView
            locale={editLocale}
            onLocaleChange={setEditLocale}
            user={user}
            page={{
                headlineDe: values.headlineDe,
                headlineEn: values.headlineEn,
                subHeadlineDe: values.subHeadlineDe,
                subHeadlineEn: values.subHeadlineEn,
                heroImageUrl: values.heroImageFileUploadId ? fileUploadPublicUrl(values.heroImageFileUploadId) : null,
                heroImageFallbackUrl,
                heroVariant,
                sections: values.sections,
                featuredCooks,
                chefForAnyOccasion,
                formatsSection,
                formatsSectionForceShow: Boolean(formatsSection),
                howItWorks,
                cities,
                knownFrom,
            }}
        />
    );

    return (
        <div className="flex flex-col gap-6">
            <Tabs value={tab}>
                <TabsList variant="line" aria-label={{ de: 'Editor-Ansicht', en: 'Editor view' }[uiLocale]}>
                    <TabsTrigger value="edit" asChild>
                        <Link to={detail.to} params={detail.params} search={{ tab: undefined }} replace>
                            {{ de: 'Bearbeiten', en: 'Edit' }[uiLocale]}
                        </Link>
                    </TabsTrigger>
                    <TabsTrigger value="preview" asChild>
                        <Link to={detail.to} params={detail.params} search={{ tab: 'preview' }} replace>
                            {{ de: 'Vorschau', en: 'Preview' }[uiLocale]}
                        </Link>
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {tab === 'preview' ? (
                <div className="overflow-hidden border border-border">{pageView}</div>
            ) : (
                <div className="grid gap-8 lg:grid-cols-2">
                    <div ref={editorColumnRef} className="flex min-w-0 flex-col gap-6">
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="w-full text-sm text-muted-foreground sm:w-auto">
                                    {{ de: 'Status', en: 'Status' }[uiLocale]}: {statusLabel}
                                </span>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            disabled={busy}
                                            aria-label={{ de: 'Weitere Aktionen', en: 'More actions' }[uiLocale]}
                                        >
                                            <MoreHorizontalIcon className="size-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {publicDetail ? (
                                            <DropdownMenuItem asChild>
                                                <Link to={publicDetail.to} params={publicDetail.params} target="_blank">
                                                    {{ de: 'Öffentliche Seite', en: 'Public page' }[uiLocale]}
                                                </Link>
                                            </DropdownMenuItem>
                                        ) : null}
                                        {status !== 'published' ? (
                                            <DropdownMenuItem
                                                disabled={busy}
                                                onSelect={() => {
                                                    setScheduleDate(publishedAtToDate(values.publishedAt) ?? undefined);
                                                    setScheduleOpen(true);
                                                }}
                                            >
                                                {{ de: 'Planen…', en: 'Schedule…' }[uiLocale]}
                                            </DropdownMenuItem>
                                        ) : null}
                                        {status !== 'draft' ? (
                                            <DropdownMenuItem disabled={busy} onSelect={() => setConfirm('unpublish')}>
                                                {{ de: 'Zurückziehen', en: 'Unpublish' }[uiLocale]}
                                            </DropdownMenuItem>
                                        ) : null}
                                        {onDelete ? (
                                            <DropdownMenuItem variant="destructive" disabled={busy} onSelect={() => setConfirm('delete')}>
                                                {{ de: 'Löschen', en: 'Delete' }[uiLocale]}
                                            </DropdownMenuItem>
                                        ) : null}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                {status !== 'published' ? (
                                    <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirm('publish')}>
                                        {{ de: 'Veröffentlichen', en: 'Publish' }[uiLocale]}
                                    </Button>
                                ) : null}
                                <Button type="button" disabled={busy} onClick={() => void handleSave()}>
                                    {{ de: 'Speichern', en: 'Save' }[uiLocale]}
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant={editLocale === 'de' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setEditLocale('de')}
                                >
                                    DE
                                </Button>
                                <Button
                                    type="button"
                                    variant={editLocale === 'en' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setEditLocale('en')}
                                >
                                    EN
                                </Button>
                            </div>
                        </div>

                        <Card className="gap-4 py-4" data-content-editor-anchor="top">
                            <CardHeader className="px-4">
                                <CardTitle>{{ de: 'SEO', en: 'SEO' }[uiLocale]}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3 px-4">
                                <Field label={{ de: 'Pfad (Slug)', en: 'Path (slug)' }[uiLocale]}>
                                    <Input
                                        value={values.pathName}
                                        onChange={(e) => patch({ pathName: pathNameSlugify(e.target.value) || e.target.value })}
                                        onBlur={() => patch({ pathName: pathNameSlugify(values.pathName) })}
                                    />
                                </Field>
                                <Field label={{ de: 'Titel', en: 'Title' }[uiLocale]}>
                                    <Input
                                        value={editLocale === 'en' ? values.titleEn : values.titleDe}
                                        onChange={(e) =>
                                            patch(editLocale === 'en' ? { titleEn: e.target.value } : { titleDe: e.target.value })
                                        }
                                    />
                                </Field>
                                <Field label={{ de: 'Beschreibung', en: 'Description' }[uiLocale]}>
                                    <Textarea
                                        rows={3}
                                        value={editLocale === 'en' ? values.descriptionEn : values.descriptionDe}
                                        onChange={(e) =>
                                            patch(
                                                editLocale === 'en' ? { descriptionEn: e.target.value } : { descriptionDe: e.target.value },
                                            )
                                        }
                                    />
                                </Field>
                            </CardContent>
                        </Card>

                        {identityFields}

                        <Card className="gap-4 py-4" data-content-editor-anchor="hero">
                            <CardHeader className="px-4">
                                <CardTitle>{{ de: 'Hero', en: 'Hero' }[uiLocale]}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3 px-4">
                                <Field label={{ de: 'Überschrift', en: 'Headline' }[uiLocale]}>
                                    <Input
                                        value={editLocale === 'en' ? values.headlineEn : values.headlineDe}
                                        onChange={(e) =>
                                            patch(editLocale === 'en' ? { headlineEn: e.target.value } : { headlineDe: e.target.value })
                                        }
                                    />
                                </Field>
                                <Field
                                    label={
                                        heroVariant === 'article'
                                            ? { de: 'Einleitung', en: 'Lead' }[uiLocale]
                                            : { de: 'Unterüberschrift', en: 'Subheadline' }[uiLocale]
                                    }
                                >
                                    {heroVariant === 'article' ? (
                                        <Textarea
                                            rows={3}
                                            value={editLocale === 'en' ? values.subHeadlineEn : values.subHeadlineDe}
                                            onChange={(e) =>
                                                patch(
                                                    editLocale === 'en'
                                                        ? { subHeadlineEn: e.target.value }
                                                        : { subHeadlineDe: e.target.value },
                                                )
                                            }
                                        />
                                    ) : (
                                        <Input
                                            value={editLocale === 'en' ? values.subHeadlineEn : values.subHeadlineDe}
                                            onChange={(e) =>
                                                patch(
                                                    editLocale === 'en'
                                                        ? { subHeadlineEn: e.target.value }
                                                        : { subHeadlineDe: e.target.value },
                                                )
                                            }
                                        />
                                    )}
                                </Field>
                                <HeroImageField
                                    fileUploadId={values.heroImageFileUploadId}
                                    uiLocale={uiLocale}
                                    onUploadStart={() => patch({})}
                                    onChange={(heroImageFileUploadId) => patch({ heroImageFileUploadId })}
                                />
                            </CardContent>
                        </Card>

                        {extraFields}

                        <ContentSectionsEditor
                            sections={values.sections}
                            onChange={(sections) => patch({ sections })}
                            editLocale={editLocale}
                            uiLocale={uiLocale}
                        />
                    </div>
                    {/*
                      Stretch this column to the form height so `sticky` keeps the
                      preview pinned while editing lower sections. Cap + inner scroll
                      so the h-dvh hero does not inflate the pane.
                    */}
                    <div className="relative hidden min-w-0 lg:block">
                        <div
                            ref={previewScrollRef}
                            className="sticky top-4 max-h-[calc(100svh-5rem)] overflow-x-hidden overflow-y-auto border border-border"
                        >
                            {pageView}
                        </div>
                    </div>
                </div>
            )}

            <AlertDialog open={confirm === 'publish'} onOpenChange={(open) => !open && setConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{{ de: 'Jetzt veröffentlichen?', en: 'Publish now?' }[uiLocale]}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {
                                {
                                    de: 'Die Seite wird sofort öffentlich erreichbar (Listen und Detailseite) und in der Sitemap aufgenommen. Die Änderung wird sofort gespeichert.',
                                    en: 'The page becomes publicly reachable (lists and detail) and is included in the sitemap. This change is saved immediately.',
                                }[uiLocale]
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{{ de: 'Abbrechen', en: 'Cancel' }[uiLocale]}</AlertDialogCancel>
                        <AlertDialogAction disabled={busy} onClick={() => void confirmPublish()}>
                            {{ de: 'Veröffentlichen', en: 'Publish' }[uiLocale]}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={confirm === 'unpublish'} onOpenChange={(open) => !open && setConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {{ de: 'Veröffentlichung zurückziehen?', en: 'Unpublish this page?' }[uiLocale]}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {
                                {
                                    de: 'Die Seite verschwindet von öffentlichen Listen und Detail-URLs und wird aus der Sitemap entfernt. Der Entwurf bleibt im Admin erhalten. Die Änderung wird sofort gespeichert.',
                                    en: 'The page disappears from public lists and detail URLs and is removed from the sitemap. The draft remains available in admin. This change is saved immediately.',
                                }[uiLocale]
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{{ de: 'Abbrechen', en: 'Cancel' }[uiLocale]}</AlertDialogCancel>
                        <AlertDialogAction disabled={busy} onClick={() => void confirmUnpublish()}>
                            {{ de: 'Zurückziehen', en: 'Unpublish' }[uiLocale]}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={confirm === 'delete'} onOpenChange={(open) => !open && setConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {{ de: 'Seite endgültig löschen?', en: 'Permanently delete this page?' }[uiLocale]}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {
                                {
                                    de: 'Löschen kann nicht rückgängig gemacht werden. Die Seite ist danach weder öffentlich noch im Admin verfügbar.',
                                    en: 'Deletion cannot be undone. The page will no longer be available publicly or in admin.',
                                }[uiLocale]
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{{ de: 'Abbrechen', en: 'Cancel' }[uiLocale]}</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" disabled={busy} onClick={() => void confirmDelete()}>
                            {{ de: 'Löschen', en: 'Delete' }[uiLocale]}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{{ de: 'Veröffentlichung planen', en: 'Schedule publication' }[uiLocale]}</DialogTitle>
                        <DialogDescription>
                            {
                                {
                                    de: 'Wähle das Go-live-Datum. Ab diesem Tag (Mitternacht Ortszeit) ist die Seite öffentlich sichtbar. Die Änderung wird sofort gespeichert.',
                                    en: 'Choose the go-live date. From that day (local midnight) the page becomes publicly visible. This change is saved immediately.',
                                }[uiLocale]
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-2 py-2">
                        <span className="text-sm font-medium">{{ de: 'Go-live-Datum', en: 'Go-live date' }[uiLocale]}</span>
                        <DatePicker
                            value={scheduleDate}
                            onValueChange={setScheduleDate}
                            placeholder={{ de: 'Datum wählen', en: 'Pick a date' }[uiLocale]}
                            locale={DATE_FNS_LOCALE[uiLocale]}
                            className="w-full"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setScheduleOpen(false)}>
                            {{ de: 'Abbrechen', en: 'Cancel' }[uiLocale]}
                        </Button>
                        <Button type="button" disabled={busy || !scheduleDate} onClick={() => void confirmSchedule()}>
                            {{ de: 'Planen', en: 'Schedule' }[uiLocale]}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
    return (
        <label className={cn('flex flex-col gap-1.5 text-sm', className)}>
            <span className="font-medium">{label}</span>
            {children}
        </label>
    );
}

function HeroImageField({
    fileUploadId,
    uiLocale,
    onChange,
    onUploadStart,
    label,
    removeTitle,
    removeDescription,
}: {
    fileUploadId: string | null;
    uiLocale: Locale;
    onChange: (fileUploadId: string | null) => void;
    /** Fired when a file is chosen, before the upload finishes — mark the form dirty so subscriptions cannot reset mid-upload. */
    onUploadStart?: () => void;
    label?: string;
    removeTitle?: string;
    removeDescription?: string;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmRemove, setConfirmRemove] = useState(false);
    const fieldLabel = label ?? { de: 'Hero-Bild', en: 'Hero image' }[uiLocale];
    const confirmTitle = removeTitle ?? { de: 'Hero-Bild entfernen?', en: 'Remove hero image?' }[uiLocale];
    const confirmDescription =
        removeDescription ??
        {
            de: 'Das Hero-Bild wird aus dem Entwurf entfernt. Speichern übernimmt die Änderung.',
            en: 'The hero image is removed from the draft. Saving applies the change.',
        }[uiLocale];

    return (
        <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">{fieldLabel}</span>
            {fileUploadId ? (
                <img
                    src={fileUploadPublicUrl(fileUploadId)}
                    alt=""
                    className="aspect-video h-auto w-full max-w-md rounded-lg object-cover"
                />
            ) : null}
            {/*
              Button + programmatic click (not a <label> wrapping the input). Focusing an
              `sr-only` file input scrolls it into view and jumps the admin workspace
              scroller, leaving a blank half-page until reload.
            */}
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                tabIndex={-1}
                disabled={busy}
                onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    onUploadStart?.();
                    setBusy(true);
                    setError(null);
                    try {
                        const uploaded = await uploadFile(file);
                        onChange(uploaded.fileUploadId);
                    } catch (err) {
                        setError(uploadErrorMessage(err, uiLocale));
                    } finally {
                        setBusy(false);
                    }
                }}
            />
            <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
                    {{ de: 'Hochladen', en: 'Upload' }[uiLocale]}
                </Button>
                {fileUploadId ? (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmRemove(true)}>
                        {{ de: 'Entfernen', en: 'Remove' }[uiLocale]}
                    </Button>
                ) : null}
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
                        <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{{ de: 'Abbrechen', en: 'Cancel' }[uiLocale]}</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={() => {
                                onChange(null);
                                setConfirmRemove(false);
                            }}
                        >
                            {{ de: 'Entfernen', en: 'Remove' }[uiLocale]}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export { HeroImageField as ContentImageField };
