import { Link, useNavigate } from '@tanstack/react-router';
import { MoreHorizontalIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { i18nResourcesLoadPromise } from '../../i18n/catalogCache';
import type { ContentSection, Locale } from '../../shared';
import { fileUploadPublicUrl, pathNameSlugify } from '../../shared/contentSection';
import { uploadErrorMessage, uploadFile } from '../chat/fileUpload';
import { useContentPageEditorPreviewSync } from '../hooks/useContentPageEditorPreviewSync';
import { useT } from '../hooks/useT';
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
    titleNl?: string;
    descriptionDe: string;
    descriptionEn: string;
    descriptionNl?: string;
    headlineDe: string;
    headlineEn: string;
    headlineNl?: string;
    subHeadlineDe: string;
    subHeadlineEn: string;
    subHeadlineNl?: string;
    heroImageFileUploadId: string | null;
    sections: ContentSection[];
    publishedAt: string | null;
};

export type ContentPageCmsLocale = 'de' | 'en' | 'nl';

const CONTENT_PAGE_CMS_LOCALE_LABEL: Record<ContentPageCmsLocale, string> = {
    de: 'DE',
    en: 'EN',
    nl: 'NL',
};

const CONTENT_PAGE_CMS_LOCALES_DEFAULT: readonly ContentPageCmsLocale[] = ['de', 'en'];

export function contentPageCmsLocale(locale: Locale): ContentPageCmsLocale {
    if (locale === 'en' || locale === 'nl') return locale;
    return 'de';
}

function contentPageEditorFieldLocale(locale: Locale, cmsLocales: readonly ContentPageCmsLocale[]): ContentPageCmsLocale {
    const cms = contentPageCmsLocale(locale);
    if (cms === 'nl' && !cmsLocales.includes('nl')) return 'en';
    return cms;
}

type ContentPageCopyStem = 'title' | 'description' | 'headline' | 'subHeadline';

function contentPageCopyGet(values: ContentPageEditorValues, locale: ContentPageCmsLocale, stem: ContentPageCopyStem): string {
    if (locale === 'nl') return values[`${stem}Nl`] ?? '';
    if (locale === 'en') return values[`${stem}En`];
    return values[`${stem}De`];
}

function contentPageCopyPatch(locale: ContentPageCmsLocale, stem: ContentPageCopyStem, value: string): Partial<ContentPageEditorValues> {
    if (locale === 'nl') return { [`${stem}Nl`]: value };
    if (locale === 'en') return { [`${stem}En`]: value };
    return { [`${stem}De`]: value };
}

type ContentPageEditorSlot = React.ReactNode | ((editLocale: Locale) => React.ReactNode);

function renderEditorSlot(slot: ContentPageEditorSlot | undefined, editLocale: Locale): React.ReactNode {
    if (typeof slot === 'function') return slot(editLocale);
    return slot;
}

export type ContentPageEditorTab = 'edit' | 'preview' | 'seo';

export type ContentPageEditorSearch = {
    tab?: ContentPageEditorTab;
};

export function parseContentPageEditorSearch(search: Record<string, unknown>): ContentPageEditorSearch {
    const tab = search.tab === 'preview' || search.tab === 'edit' || search.tab === 'seo' ? search.tab : undefined;
    return { tab };
}

export function contentPageEditorTabFromSearch(search: ContentPageEditorSearch, options: { seoTab?: boolean } = {}): ContentPageEditorTab {
    if (search.tab === 'preview') return 'preview';
    if (search.tab === 'seo' && options.seoTab) return 'seo';
    return 'edit';
}

type ContentPageEditorDetail =
    | { to: '/{-$locale}/admin/cities/$cityId'; params: { cityId: string } }
    | { to: '/{-$locale}/admin/partner-venues/$partnerVenueId'; params: { partnerVenueId: string } }
    | { to: '/{-$locale}/admin/occasions/$occasionId'; params: { occasionId: string } }
    | { to: '/{-$locale}/admin/blog-posts/$blogPostId'; params: { blogPostId: string } };

type ContentPageEditorListTo =
    '/{-$locale}/admin/cities' | '/{-$locale}/admin/partners' | '/{-$locale}/admin/occasions' | '/{-$locale}/admin/blog-posts';

type ContentPagePublicDetail =
    | { to: '/{-$locale}/cities/$pathName'; params: { pathName: string } }
    | { to: '/{-$locale}/venues/$pathName'; params: { pathName: string } }
    | { to: '/{-$locale}/occasions/$pathName'; params: { pathName: string } }
    | { to: '/{-$locale}/blog-posts/$pathName'; params: { pathName: string } };

function contentPagePublicDetail(listTo: ContentPageEditorListTo, pathName: string): ContentPagePublicDetail {
    if (listTo === '/{-$locale}/admin/cities') {
        return { to: '/{-$locale}/cities/$pathName', params: { pathName } };
    }
    if (listTo === '/{-$locale}/admin/partners') {
        return { to: '/{-$locale}/venues/$pathName', params: { pathName } };
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
    cmsLocales = CONTENT_PAGE_CMS_LOCALES_DEFAULT,
    localeActions,
    identityFields,
    extraFields,
    listTo,
    detail,
    tab,
    seoTab = false,
    seoTabContent,
    user,
    featuredCooks,
    featuredCooksShowCity,
    testimonials,
    chefForAnyOccasion,
    formatsSection,
    heroImageFallbackUrl,
    heroImageOverlay,
    heroExtraFields,
    heroVariant = 'fullBleed',
    howItWorks,
    howItWorksHideCta,
    howItWorksAlternativeMedia,
    cities,
    citiesCountryCode,
    venuesExplore,
    knownFrom,
}: {
    uiLocale: Locale;
    values: ContentPageEditorValues;
    /** Partial merge — callers must apply with functional setState so async uploads cannot clobber newer edits. */
    onChange: (partial: Partial<ContentPageEditorValues>) => void;
    onSave: (values: ContentPageEditorValues) => Promise<void>;
    onDelete?: () => Promise<void>;
    busy: boolean;
    /** CMS locales shown in the editor language toggle. Cities pass DE/EN/NL. */
    cmsLocales?: readonly ContentPageCmsLocale[];
    /** Extra controls next to the DE/EN/NL toggle (city translate-from-German). */
    localeActions?: (editLocale: Locale) => React.ReactNode;
    /** Entity identity (name, geo, …) — rendered after SEO, before Hero. */
    identityFields?: ContentPageEditorSlot;
    /** Page-body extras (first section, cooks, testimonials, …) — after Hero, before configurable sections. */
    extraFields?: ContentPageEditorSlot;
    listTo: ContentPageEditorListTo;
    detail: ContentPageEditorDetail;
    tab: ContentPageEditorTab;
    /** When true, path/title/description move onto an SEO tab (city traffic + meta). */
    seoTab?: boolean;
    /** Rendered above the SEO fields (90-day visit sparkline). */
    seoTabContent?: React.ReactNode;
    user: PublicHeaderUser;
    featuredCooks?: ContentPageViewModel['featuredCooks'];
    featuredCooksShowCity?: ContentPageViewModel['featuredCooksShowCity'];
    testimonials?: ContentPageViewModel['testimonials'];
    chefForAnyOccasion?: ContentPageViewModel['chefForAnyOccasion'];
    formatsSection?: ContentPageViewModel['formatsSection'];
    heroImageFallbackUrl?: ContentPageViewModel['heroImageFallbackUrl'];
    heroImageOverlay?: ContentPageViewModel['heroImageOverlay'];
    /** Partner-only controls under the hero image (e.g. overlay toggle). */
    heroExtraFields?: React.ReactNode;
    /** `article` = blog title / lead / rounded image preview (still edits the shared Hero fields). */
    heroVariant?: ContentPageViewModel['heroVariant'];
    howItWorks?: ContentPageViewModel['howItWorks'];
    howItWorksHideCta?: ContentPageViewModel['howItWorksHideCta'];
    howItWorksAlternativeMedia?: ContentPageViewModel['howItWorksAlternativeMedia'];
    cities?: ContentPageViewModel['cities'];
    citiesCountryCode?: ContentPageViewModel['citiesCountryCode'];
    venuesExplore?: ContentPageViewModel['venuesExplore'];
    knownFrom?: ContentPageViewModel['knownFrom'];
}) {
    const navigate = useNavigate();
    const { t } = useT('common');
    const [editLocale, setEditLocale] = useState<Locale>('de');
    const [confirm, setConfirm] = useState<'publish' | 'unpublish' | 'delete' | null>(null);
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
    const editorColumnRef = useRef<HTMLDivElement>(null);
    const previewScrollRef = useRef<HTMLDivElement>(null);
    const status = publishStatusFrom(values.publishedAt);
    const publicDetail = values.pathName.trim() ? contentPagePublicDetail(listTo, values.pathName.trim()) : null;
    const fieldLocale = contentPageEditorFieldLocale(editLocale, cmsLocales);
    const sectionEditLocale = fieldLocale === 'nl' ? 'en' : fieldLocale;

    // Warm EN catalogs while the editor is still on DE so the first DE→EN preview
    // flip does not blank the pane waiting on Suspense inside ContentPageView.
    useEffect(() => {
        void i18nResourcesLoadPromise('en', ['common', 'public']);
    }, []);
    useEffect(() => {
        if (cmsLocales.includes('nl')) {
            void i18nResourcesLoadPromise('nl', ['common', 'public']);
        }
    }, [cmsLocales]);

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
            toast.success(t('contentPage.saved'));
        } catch {
            toast.error(t('saveFailed'));
            throw new Error('save failed');
        }
    }

    async function handleSave() {
        try {
            await onSave(values);
            toast.success(t('contentPage.saved'));
        } catch {
            toast.error(t('saveFailed'));
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
            toast.success(t('contentPage.deleted'));
            setConfirm(null);
            await navigate({ to: listTo });
        } catch {
            toast.error(t('contentPage.couldNotDelete'));
        }
    }

    const statusLabel = t(`contentPage.status.${status}`);

    const pageView = (
        <ContentPageView
            locale={editLocale}
            onLocaleChange={setEditLocale}
            user={user}
            page={{
                headlineDe: values.headlineDe,
                headlineEn: values.headlineEn,
                headlineNl: values.headlineNl,
                subHeadlineDe: values.subHeadlineDe,
                subHeadlineEn: values.subHeadlineEn,
                subHeadlineNl: values.subHeadlineNl,
                heroImageUrl: values.heroImageFileUploadId ? fileUploadPublicUrl(values.heroImageFileUploadId) : null,
                heroImageFallbackUrl,
                heroImageOverlay,
                heroVariant,
                sections: values.sections,
                featuredCooks,
                featuredCooksShowCity,
                testimonials,
                chefForAnyOccasion,
                formatsSection,
                formatsSectionForceShow: Boolean(formatsSection),
                howItWorks,
                howItWorksHideCta,
                howItWorksAlternativeMedia,
                cities,
                citiesCountryCode,
                venuesExplore,
                knownFrom,
            }}
        />
    );

    const editorToolbar = (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
                <span className="w-full text-sm text-muted-foreground sm:w-auto">
                    {t('contentPage.statusLabel')}: {statusLabel}
                </span>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button type="button" variant="outline" size="icon" disabled={busy} aria-label={t('contentPage.moreActions')}>
                            <MoreHorizontalIcon className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {publicDetail ? (
                            <DropdownMenuItem asChild>
                                <Link to={publicDetail.to} params={publicDetail.params} target="_blank">
                                    {t('contentPage.publicPage')}
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
                                {t('contentPage.schedule')}
                            </DropdownMenuItem>
                        ) : null}
                        {status !== 'draft' ? (
                            <DropdownMenuItem disabled={busy} onSelect={() => setConfirm('unpublish')}>
                                {t('contentPage.unpublish')}
                            </DropdownMenuItem>
                        ) : null}
                        {onDelete ? (
                            <DropdownMenuItem variant="destructive" disabled={busy} onSelect={() => setConfirm('delete')}>
                                {t('contentPage.delete')}
                            </DropdownMenuItem>
                        ) : null}
                    </DropdownMenuContent>
                </DropdownMenu>
                {status !== 'published' ? (
                    <Button type="button" variant="outline" disabled={busy} onClick={() => setConfirm('publish')}>
                        {t('contentPage.publish')}
                    </Button>
                ) : null}
                <Button type="button" disabled={busy} onClick={() => void handleSave()}>
                    {t('save')}
                </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {cmsLocales.map((cmsLocale) => (
                    <Button
                        key={cmsLocale}
                        type="button"
                        variant={editLocale === cmsLocale ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setEditLocale(cmsLocale)}
                    >
                        {CONTENT_PAGE_CMS_LOCALE_LABEL[cmsLocale]}
                    </Button>
                ))}
                {localeActions?.(editLocale)}
            </div>
        </div>
    );

    const seoCard = (
        <Card className="gap-4 py-4" data-content-editor-anchor="top">
            <CardHeader className="px-4">
                <CardTitle>{t('contentPage.seo')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 px-4">
                <Field label={t('contentPage.pathSlug')}>
                    <Input
                        value={values.pathName}
                        onChange={(e) => patch({ pathName: pathNameSlugify(e.target.value) || e.target.value })}
                        onBlur={() => patch({ pathName: pathNameSlugify(values.pathName) })}
                    />
                </Field>
                <Field label={t('contentPage.title')}>
                    <Input
                        value={contentPageCopyGet(values, fieldLocale, 'title')}
                        onChange={(e) => patch(contentPageCopyPatch(fieldLocale, 'title', e.target.value))}
                    />
                </Field>
                <Field label={t('contentPage.description')}>
                    <Textarea
                        rows={3}
                        value={contentPageCopyGet(values, fieldLocale, 'description')}
                        onChange={(e) => patch(contentPageCopyPatch(fieldLocale, 'description', e.target.value))}
                    />
                </Field>
            </CardContent>
        </Card>
    );

    return (
        <div className="flex flex-col gap-6">
            <Tabs value={tab}>
                <TabsList variant="line" aria-label={t('contentPage.editorView')}>
                    <TabsTrigger value="edit" asChild>
                        <Link to={detail.to} params={detail.params} search={{ tab: undefined }} replace>
                            {t('contentPage.edit')}
                        </Link>
                    </TabsTrigger>
                    <TabsTrigger value="preview" asChild>
                        <Link to={detail.to} params={detail.params} search={{ tab: 'preview' }} replace>
                            {t('contentPage.preview')}
                        </Link>
                    </TabsTrigger>
                    {seoTab ? (
                        <TabsTrigger value="seo" asChild>
                            <Link to={detail.to} params={detail.params} search={{ tab: 'seo' }} replace>
                                {t('contentPage.seo')}
                            </Link>
                        </TabsTrigger>
                    ) : null}
                </TabsList>
            </Tabs>

            {tab === 'preview' ? (
                // `translateZ(0)` makes Header's over-media `fixed` relative to this
                // pane so chrome stays inside the preview instead of the viewport.
                <div className="overflow-hidden border border-border transform-[translateZ(0)]">{pageView}</div>
            ) : tab === 'seo' && seoTab ? (
                <div className="flex max-w-2xl flex-col gap-6">
                    {editorToolbar}
                    {seoTabContent}
                    {seoCard}
                </div>
            ) : (
                <div className="grid gap-8 lg:grid-cols-2">
                    <div ref={editorColumnRef} className="flex min-w-0 flex-col gap-6">
                        {editorToolbar}

                        {seoTab ? null : seoCard}

                        {renderEditorSlot(identityFields, editLocale)}

                        <Card className="gap-4 py-4" data-content-editor-anchor="hero">
                            <CardHeader className="px-4">
                                <CardTitle>{t('contentPage.hero')}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3 px-4">
                                <Field label={t('contentPage.headline')}>
                                    <Input
                                        value={contentPageCopyGet(values, fieldLocale, 'headline')}
                                        onChange={(e) => patch(contentPageCopyPatch(fieldLocale, 'headline', e.target.value))}
                                    />
                                </Field>
                                <Field label={heroVariant === 'article' ? t('contentPage.lead') : t('contentPage.subheadline')}>
                                    {heroVariant === 'article' ? (
                                        <Textarea
                                            rows={3}
                                            value={contentPageCopyGet(values, fieldLocale, 'subHeadline')}
                                            onChange={(e) => patch(contentPageCopyPatch(fieldLocale, 'subHeadline', e.target.value))}
                                        />
                                    ) : (
                                        <Input
                                            value={contentPageCopyGet(values, fieldLocale, 'subHeadline')}
                                            onChange={(e) => patch(contentPageCopyPatch(fieldLocale, 'subHeadline', e.target.value))}
                                        />
                                    )}
                                </Field>
                                <HeroImageField
                                    fileUploadId={values.heroImageFileUploadId}
                                    uiLocale={uiLocale}
                                    onUploadStart={() => patch({})}
                                    onChange={(heroImageFileUploadId) => patch({ heroImageFileUploadId })}
                                />
                                {heroExtraFields}
                            </CardContent>
                        </Card>

                        {renderEditorSlot(extraFields, editLocale)}

                        <ContentSectionsEditor
                            sections={values.sections}
                            onChange={(sections) => patch({ sections })}
                            editLocale={sectionEditLocale}
                            uiLocale={uiLocale}
                        />
                    </div>
                    {/*
                      Stretch this column to the form height so `sticky` keeps the
                      preview pinned while editing lower sections. Cap + inner scroll
                      so the h-dvh hero does not inflate the pane. Transform stays on
                      the scrollport (not the sticky wrapper) so Header `fixed` over
                      media is contained here instead of bleeding into admin chrome.
                    */}
                    <div className="relative hidden min-w-0 lg:block">
                        <div className="sticky top-4 max-h-[calc(100svh-5rem)]">
                            <div
                                ref={previewScrollRef}
                                className="max-h-[calc(100svh-5rem)] overflow-x-hidden overflow-y-auto border border-border transform-[translateZ(0)]"
                            >
                                {pageView}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <AlertDialog open={confirm === 'publish'} onOpenChange={(open) => !open && setConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('contentPage.publishNow')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('contentPage.publishNowBody')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction disabled={busy} onClick={() => void confirmPublish()}>
                            {t('contentPage.publish')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={confirm === 'unpublish'} onOpenChange={(open) => !open && setConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('contentPage.unpublishTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('contentPage.unpublishBody')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction disabled={busy} onClick={() => void confirmUnpublish()}>
                            {t('contentPage.unpublish')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={confirm === 'delete'} onOpenChange={(open) => !open && setConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('contentPage.deleteTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('contentPage.deleteBody')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" disabled={busy} onClick={() => void confirmDelete()}>
                            {t('contentPage.delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('contentPage.scheduleTitle')}</DialogTitle>
                        <DialogDescription>{t('contentPage.scheduleBody')}</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-2 py-2">
                        <span className="text-sm font-medium">{t('contentPage.goLiveDate')}</span>
                        <DatePicker
                            value={scheduleDate}
                            onValueChange={setScheduleDate}
                            placeholder={t('contentPage.pickADate')}
                            locale={DATE_FNS_LOCALE[uiLocale]}
                            className="w-full"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setScheduleOpen(false)}>
                            {t('cancel')}
                        </Button>
                        <Button type="button" disabled={busy || !scheduleDate} onClick={() => void confirmSchedule()}>
                            {t('contentPage.scheduleConfirm')}
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
    const { t } = useT('common');
    const inputRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [confirmRemove, setConfirmRemove] = useState(false);
    const fieldLabel = label ?? t('contentPage.heroImage');
    const confirmTitle = removeTitle ?? t('contentPage.removeHeroImage');
    const confirmDescription = removeDescription ?? t('contentPage.removeHeroImageBody');

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
                    {t('contentPage.upload')}
                </Button>
                {fileUploadId ? (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmRemove(true)}>
                        {t('contentPage.remove')}
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
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={() => {
                                onChange(null);
                                setConfirmRemove(false);
                            }}
                        >
                            {t('contentPage.remove')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export { HeroImageField as ContentImageField };
