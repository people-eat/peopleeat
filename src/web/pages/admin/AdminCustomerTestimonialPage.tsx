import { useForm, useSelector } from '@tanstack/react-form';
import { useNavigate } from '@tanstack/react-router';
import { MoreHorizontalIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { t } from '../../../i18n/t';
import { isTestimonialRating } from '../../../shared';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { AdminTestimonialAuthorCard } from '../../components/AdminTestimonialAuthorCard';
import { AdminTestimonialDetailContent } from '../../components/AdminTestimonialDetailContent';
import { AdminTestimonialPublicPagePlacementsSection } from '../../components/AdminTestimonialPublicPagePlacements';
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
import { Button } from '../../components/base/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/base/dropdown-menu';
import { Input } from '../../components/base/input';
import { StatusBadge } from '../../components/base/status-badge';
import { Textarea } from '../../components/base/textarea';
import { TestimonialDetailDialog } from '../../components/TestimonialCard';
import { TestimonialRatingInput } from '../../components/TestimonialRatingInput';
import type { GqlCAdminCustomerTestimonialPageQuery } from '../../graphql/generated';
import {
    AdminCustomerTestimonialDetailDeleteDocument,
    AdminCustomerTestimonialDetailImageUpdateDocument,
    AdminCustomerTestimonialDetailPublishDocument,
    AdminCustomerTestimonialDetailUpsertDocument,
    AdminCustomerTestimonialPageUpdatesDocument,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import type { Locale } from '../../utils/locale';
import { adminStubRouteBySlug, adminStubRouteTitle } from './adminCatalog';
import { AdminTestimonialImageManager } from './AdminTestimonialImageManager';
import { testimonialPublicationStatusLabel } from './adminTestimonialsShared';

const listRoute = adminStubRouteBySlug('testimonials');
const FORM_ID = 'admin-customer-testimonial-form';

export function adminCustomerTestimonialPageTitle(locale: Locale): string {
    return t(locale, 'admin', 'pages.customerTestimonial.title');
}
export function adminCustomerTestimonialPageDescription(locale: Locale): string {
    return t(locale, 'admin', 'pages.customerTestimonial.description');
}

type AdminCustomerTestimonialDetail = NonNullable<
    NonNullable<NonNullable<GqlCAdminCustomerTestimonialPageQuery['currentSession']['user']>['admin']>['customerTestimonial']
>;

type FormValues = {
    authorName: string;
    location: string;
    occasion: string;
    body: string;
    rating: number | null;
};

function formFromTestimonial(testimonial: AdminCustomerTestimonialDetail): FormValues {
    return {
        authorName: testimonial.authorName ?? '',
        location: testimonial.location ?? '',
        occasion: testimonial.occasion ?? '',
        body: testimonial.body,
        rating: testimonial.rating ?? null,
    };
}

function fieldErrorText(errors: unknown[]): string | undefined {
    const first = errors[0];
    return typeof first === 'string' && first.length > 0 ? first : undefined;
}

function requiredRating(value: number | null, locale: Locale): string | undefined {
    if (!isTestimonialRating(value)) {
        return t(locale, 'admin', 'copy.pleaseChooseAStarRating');
    }
    return undefined;
}

export function AdminCustomerTestimonialPage({
    data,
    customerTestimonialId,
}: {
    data: GqlCAdminCustomerTestimonialPageQuery;
    customerTestimonialId: string;
}) {
    const locale = useLocale();
    const navigate = useNavigate();
    const client = useClient();
    const seed = data.currentSession.user?.admin?.customerTestimonial ?? null;
    const [testimonial, setTestimonial] = useState(seed);
    const [, upsertTestimonial] = useMutation(AdminCustomerTestimonialDetailUpsertDocument);
    const [, deleteTestimonial] = useMutation(AdminCustomerTestimonialDetailDeleteDocument);
    const [, publishTestimonial] = useMutation(AdminCustomerTestimonialDetailPublishDocument);
    const [, updateImages] = useMutation(AdminCustomerTestimonialDetailImageUpdateDocument);
    const [editing, setEditing] = useState(false);
    const [publishBusy, setPublishBusy] = useState(false);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [confirm, setConfirm] = useState<'publish' | 'unpublish' | 'delete' | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);

    const form = useForm({
        defaultValues: testimonial
            ? formFromTestimonial(testimonial)
            : { authorName: '', location: '', occasion: '', body: '', rating: null },
        onSubmit: async ({ value }) => {
            if (!testimonial) return;
            const result = await upsertTestimonial({
                input: {
                    customerTestimonialId,
                    userId: testimonial.userId,
                    bookingRequestOfferId: testimonial.bookingRequestOfferId,
                    authorName: value.authorName.trim() || null,
                    location: value.location.trim() || null,
                    occasion: value.occasion.trim() || null,
                    body: value.body,
                    rating: value.rating,
                },
            });
            if (result.error || !result.data?.admin.customerTestimonialUpsert.success) {
                toast.error(t(locale, 'admin', 'copy.couldNotSave'));
                return;
            }
            toast.success(t(locale, 'admin', 'copy.saved'));
            setEditing(false);
        },
    });
    const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
    const isDirty = useSelector(form.store, (state) => state.isDirty);
    const submissionAttempts = useSelector(form.store, (state) => state.submissionAttempts);

    useEffect(() => {
        setTestimonial(seed);
    }, [seed]);

    useEffect(() => {
        if (!seed) return;
        const request = createRequest(AdminCustomerTestimonialPageUpdatesDocument, { customerTestimonialId });
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                const next = result.data?.adminUpdates.customerTestimonial;
                if (next) {
                    setTestimonial(next);
                    if (!editing) form.reset(formFromTestimonial(next));
                }
            }),
        );
        return unsubscribe;
    }, [client, customerTestimonialId, editing, seed]);

    function onStartEdit() {
        if (!testimonial) return;
        form.reset(formFromTestimonial(testimonial));
        setEditing(true);
    }

    function onCancelEdit() {
        if (!testimonial) return;
        form.reset(formFromTestimonial(testimonial));
        setEditing(false);
    }

    async function onConfirmPublish(next: 'PUBLISHED' | 'PENDING_REVIEW') {
        if (!testimonial || publishBusy) return;
        setPublishBusy(true);
        try {
            const result = await publishTestimonial({ customerTestimonialId, publicationStatus: next });
            if (result.error || !result.data?.admin.customerTestimonialPublish.success) {
                throw new Error('publish failed');
            }
            setConfirm(null);
            toast.success(next === 'PUBLISHED' ? t(locale, 'admin', 'copy.published') : t(locale, 'admin', 'copy.unpublished'));
        } catch {
            toast.error(t(locale, 'admin', 'copy.couldNotUpdateTheStatus'));
        } finally {
            setPublishBusy(false);
        }
    }

    async function onDelete() {
        setDeleteBusy(true);
        try {
            const result = await deleteTestimonial({ customerTestimonialId });
            if (result.error || !result.data?.admin.customerTestimonialDelete.success) {
                throw new Error('delete failed');
            }
            setConfirm(null);
            await navigate({ to: listRoute.to });
        } catch {
            toast.error(t(locale, 'admin', 'copy.couldNotDeleteTheTestimonial'));
            setDeleteBusy(false);
        }
    }

    async function onSaveImages(fileUploadIds: string[]): Promise<boolean> {
        const result = await updateImages({ customerTestimonialId, imageFileUploadIds: fileUploadIds });
        return Boolean(result.data?.admin.customerTestimonialImageUpdate.success) && !result.error;
    }

    const crumbLabel = testimonial?.displayAuthorName || adminCustomerTestimonialPageTitle(locale);
    const formBusy = isSubmitting || publishBusy || deleteBusy;
    const publicationTone = testimonial?.publicationStatus === 'PUBLISHED' ? 'success' : 'warning';

    return (
        <AdminPageChrome
            crumbs={[{ label: adminStubRouteTitle(listRoute.slug, locale), to: '/{-$locale}/admin/testimonials' }, { label: crumbLabel }]}
            contentClassName="min-h-0 overflow-hidden gap-0"
        >
            {testimonial ? (
                <>
                    <AdminPinnedFooterLayout
                        contentClassName="grid w-full max-w-xl content-start gap-8"
                        footer={
                            editing ? (
                                <>
                                    <Button type="button" variant="outline" disabled={formBusy} onClick={onCancelEdit}>
                                        {t(locale, 'admin', 'copy.cancel')}
                                    </Button>
                                    <Button type="submit" form={FORM_ID} disabled={formBusy || !isDirty}>
                                        {isSubmitting ? t(locale, 'admin', 'copy.saving2') : t(locale, 'admin', 'copy.save')}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                disabled={formBusy}
                                                aria-label={t(locale, 'admin', 'copy.moreActions')}
                                            >
                                                <MoreHorizontalIcon className="size-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {testimonial.publicationStatus === 'PUBLISHED' ? (
                                                <DropdownMenuItem disabled={publishBusy} onSelect={() => setConfirm('unpublish')}>
                                                    {t(locale, 'admin', 'copy.unpublish')}
                                                </DropdownMenuItem>
                                            ) : null}
                                            <DropdownMenuItem
                                                variant="destructive"
                                                disabled={deleteBusy}
                                                onSelect={() => setConfirm('delete')}
                                            >
                                                {t(locale, 'admin', 'copy.delete')}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <Button type="button" variant="outline" onClick={() => setPreviewOpen(true)}>
                                        {t(locale, 'admin', 'copy.publicView')}
                                    </Button>
                                    {testimonial.publicationStatus !== 'PUBLISHED' ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={publishBusy}
                                            onClick={() => setConfirm('publish')}
                                        >
                                            {t(locale, 'admin', 'copy.publish')}
                                        </Button>
                                    ) : null}
                                    <Button type="button" disabled={formBusy} onClick={onStartEdit}>
                                        {t(locale, 'admin', 'copy.edit')}
                                    </Button>
                                </>
                            )
                        }
                    >
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="font-serif text-3xl/tight text-foreground">{adminCustomerTestimonialPageTitle(locale)}</h1>
                            <StatusBadge tone={publicationTone}>
                                {testimonialPublicationStatusLabel(testimonial.publicationStatus, locale)}
                            </StatusBadge>
                        </div>

                        {editing ? (
                            <>
                                <form
                                    id={FORM_ID}
                                    className="grid gap-4"
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        void form.handleSubmit();
                                    }}
                                >
                                    <h2 className="text-sm font-medium text-foreground">{t(locale, 'admin', 'copy.content')}</h2>
                                    <form.Field name="authorName">
                                        {(field) => (
                                            <div className="grid gap-1.5">
                                                <label htmlFor={field.name} className="text-sm font-medium">
                                                    {t(locale, 'admin', 'copy.nameOverride')}
                                                </label>
                                                <Input
                                                    id={field.name}
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={(event) => field.handleChange(event.target.value)}
                                                    placeholder={testimonial.displayAuthorName}
                                                />
                                            </div>
                                        )}
                                    </form.Field>
                                    <form.Field name="location">
                                        {(field) => (
                                            <div className="grid gap-1.5">
                                                <label htmlFor={field.name} className="text-sm font-medium">
                                                    {t(locale, 'admin', 'copy.locationOverride')}
                                                </label>
                                                <Input
                                                    id={field.name}
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={(event) => field.handleChange(event.target.value)}
                                                    placeholder={testimonial.displayLocation ?? undefined}
                                                />
                                            </div>
                                        )}
                                    </form.Field>
                                    <form.Field name="occasion">
                                        {(field) => (
                                            <div className="grid gap-1.5">
                                                <label htmlFor={field.name} className="text-sm font-medium">
                                                    {t(locale, 'admin', 'copy.occasionOverride')}
                                                </label>
                                                <Input
                                                    id={field.name}
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={(event) => field.handleChange(event.target.value)}
                                                    placeholder={testimonial.displayOccasion ?? undefined}
                                                />
                                            </div>
                                        )}
                                    </form.Field>
                                    <form.Field name="body">
                                        {(field) => (
                                            <div className="grid gap-1.5">
                                                <label htmlFor={field.name} className="text-sm font-medium">
                                                    {t(locale, 'admin', 'copy.body')}
                                                </label>
                                                <Textarea
                                                    id={field.name}
                                                    value={field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={(event) => field.handleChange(event.target.value)}
                                                    rows={5}
                                                />
                                            </div>
                                        )}
                                    </form.Field>
                                    <form.Field
                                        name="rating"
                                        validators={{
                                            onSubmit: ({ value }) => requiredRating(value, locale),
                                        }}
                                    >
                                        {(field) => {
                                            const errorMessage = fieldErrorText(field.state.meta.errors);
                                            const showError = errorMessage != null && submissionAttempts > 0;
                                            const errorId = `${field.name}-error`;
                                            return (
                                                <div className="grid gap-1.5">
                                                    <span className="text-sm font-medium">{t(locale, 'admin', 'copy.rating')}</span>
                                                    <div aria-invalid={showError} aria-describedby={showError ? errorId : undefined}>
                                                        <TestimonialRatingInput
                                                            value={field.state.value}
                                                            onChange={(next) => field.handleChange(next)}
                                                        />
                                                    </div>
                                                    {showError ? (
                                                        <p id={errorId} className="text-sm text-destructive" role="alert">
                                                            {errorMessage}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            );
                                        }}
                                    </form.Field>
                                </form>

                                <div className="grid gap-3">
                                    <h2 className="text-sm font-medium text-foreground">{t(locale, 'admin', 'copy.images')}</h2>
                                    <AdminTestimonialImageManager imageUrls={testimonial.imageUrls} onSave={onSaveImages} />
                                </div>
                            </>
                        ) : (
                            <AdminTestimonialDetailContent
                                occasion={testimonial.displayOccasion}
                                body={testimonial.body}
                                rating={testimonial.rating ?? null}
                                imageUrls={testimonial.imageUrls}
                            />
                        )}

                        <AdminTestimonialAuthorCard
                            user={{
                                userId: testimonial.user.userId,
                                firstName: testimonial.user.firstName,
                                lastName: testimonial.user.lastName,
                                emailAddress: testimonial.user.emailAddress,
                                profilePictureUrl: testimonial.user.profilePicture?.url,
                            }}
                            role="customer"
                            bookingRequestOfferId={testimonial.bookingRequestOfferId}
                        />

                        <AdminTestimonialPublicPagePlacementsSection placements={testimonial.publicPagePlacements} />
                    </AdminPinnedFooterLayout>

                    <TestimonialDetailDialog
                        testimonial={{
                            authorName: testimonial.displayAuthorName,
                            location: testimonial.displayLocation,
                            occasion: testimonial.displayOccasion,
                            body: testimonial.body,
                            rating: testimonial.rating ?? null,
                            imageUrls: testimonial.imageUrls,
                            createdAt: testimonial.createdAt,
                        }}
                        open={previewOpen}
                        onOpenChange={setPreviewOpen}
                    />

                    <AlertDialog open={confirm === 'publish'} onOpenChange={(open) => !open && setConfirm(null)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t(locale, 'admin', 'copy.publishNow')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {t(locale, 'admin', 'copy.theReviewBecomesVisibleOnPublicPagesWhereItIsCuratedOrLinked')}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={publishBusy}>{t(locale, 'admin', 'copy.cancel')}</AlertDialogCancel>
                                <AlertDialogAction disabled={publishBusy} onClick={() => void onConfirmPublish('PUBLISHED')}>
                                    {t(locale, 'admin', 'copy.publish')}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog open={confirm === 'unpublish'} onOpenChange={(open) => !open && setConfirm(null)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t(locale, 'admin', 'copy.unpublishThisReview')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {t(locale, 'admin', 'copy.theReviewWillDisappearFromPublicPagesUntilItIsPublishedAgain')}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={publishBusy}>{t(locale, 'admin', 'copy.cancel')}</AlertDialogCancel>
                                <AlertDialogAction disabled={publishBusy} onClick={() => void onConfirmPublish('PENDING_REVIEW')}>
                                    {t(locale, 'admin', 'copy.unpublish')}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog open={confirm === 'delete'} onOpenChange={(open) => !open && setConfirm(null)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t(locale, 'admin', 'copy.deleteThisTestimonial')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {t(locale, 'admin', 'copy.thisPermanentlyRemovesTheTestimonialAndAnyCurationEntries')}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={deleteBusy}>{t(locale, 'admin', 'copy.cancel')}</AlertDialogCancel>
                                <AlertDialogAction variant="destructive" disabled={deleteBusy} onClick={() => void onDelete()}>
                                    {t(locale, 'admin', 'copy.delete')}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </>
            ) : (
                <main id="main-content" className="grid w-full content-start gap-8">
                    <p className="text-sm text-muted-foreground">{t(locale, 'admin', 'copy.testimonialNotFound')}</p>
                </main>
            )}
        </AdminPageChrome>
    );
}
