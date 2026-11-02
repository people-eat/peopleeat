import { useForm, useSelector } from '@tanstack/react-form';
import { Link, useNavigate } from '@tanstack/react-router';
import { MoreHorizontalIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { formatDate, isTestimonialRating, userDisplayName } from '../../../shared';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { AdminPinnedFooterLayout } from '../../components/AdminPinnedFooterLayout';
import { AdminTestimonialOfferLink } from '../../components/AdminTestimonialOfferLink';
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
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/base/dropdown-menu';
import { Input } from '../../components/base/input';
import { Textarea } from '../../components/base/textarea';
import { PageTestimonialDetailDialog } from '../../components/PageTestimonialCard';
import { TestimonialRatingInput } from '../../components/TestimonialRatingInput';
import { TestimonialRatingStars } from '../../components/TestimonialRatingStars';
import type { GqlCAdminCustomerTestimonialPageQuery } from '../../graphql/generated';
import {
    AdminCustomerTestimonialDetailDeleteDocument,
    AdminCustomerTestimonialDetailImageUpdateDocument,
    AdminCustomerTestimonialDetailPublishDocument,
    AdminCustomerTestimonialDetailUpdateDocument,
    AdminCustomerTestimonialPageUpdatesDocument,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import type { Locale } from '../../utils/locale';
import { adminStubRouteBySlug } from './adminCatalog';
import { AdminTestimonialImageManager } from './AdminTestimonialImageManager';
import { testimonialPublicationStatusLabel } from './adminTestimonialsShared';

const listRoute = adminStubRouteBySlug('testimonials');
const FORM_ID = 'admin-customer-testimonial-form';

export const adminCustomerTestimonialPageTitle = { de: 'Kundenbewertung', en: 'Customer testimonial' } as const;
export const adminCustomerTestimonialPageDescription = {
    de: 'Kundenbewertung ansehen, bearbeiten, veröffentlichen oder löschen.',
    en: 'View, edit, publish, or delete a customer testimonial.',
} as const;

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
        return { de: 'Bitte wähle eine Sternebewertung.', en: 'Please choose a star rating.' }[locale];
    }
    return undefined;
}

function DetailField({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="grid gap-1">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
            <dd className="text-sm whitespace-pre-wrap text-foreground">{value}</dd>
        </div>
    );
}

export function AdminCustomerTestimonialPage({
    data,
    customerTestimonialId,
}: {
    data: GqlCAdminCustomerTestimonialPageQuery;
    customerTestimonialId: string;
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate();
    const client = useClient();
    const seed = data.currentSession.user?.admin?.customerTestimonial ?? null;
    const [testimonial, setTestimonial] = useState(seed);
    const [, updateTestimonial] = useMutation(AdminCustomerTestimonialDetailUpdateDocument);
    const [, deleteTestimonial] = useMutation(AdminCustomerTestimonialDetailDeleteDocument);
    const [, publishTestimonial] = useMutation(AdminCustomerTestimonialDetailPublishDocument);
    const [, updateImages] = useMutation(AdminCustomerTestimonialDetailImageUpdateDocument);
    const [editing, setEditing] = useState(false);
    const [publishBusy, setPublishBusy] = useState(false);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [confirm, setConfirm] = useState<'publish' | 'unpublish' | 'delete' | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const empty = { de: 'Nicht angegeben', en: 'Not set' }[locale];

    const form = useForm({
        defaultValues: testimonial
            ? formFromTestimonial(testimonial)
            : { authorName: '', location: '', occasion: '', body: '', rating: null },
        onSubmit: async ({ value }) => {
            const result = await updateTestimonial({
                customerTestimonialId,
                input: {
                    authorName: value.authorName.trim() || null,
                    location: value.location.trim() || null,
                    occasion: value.occasion.trim() || null,
                    body: value.body,
                    rating: value.rating,
                },
            });
            if (result.error || !result.data?.admin.customerTestimonialUpdate.success) {
                toast.error({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }[locale]);
                return;
            }
            toast.success({ de: 'Gespeichert.', en: 'Saved.' }[locale]);
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
            toast.success(
                next === 'PUBLISHED'
                    ? { de: 'Veröffentlicht.', en: 'Published.' }[locale]
                    : { de: 'Zurückgezogen.', en: 'Unpublished.' }[locale],
            );
        } catch {
            toast.error({ de: 'Status konnte nicht geändert werden.', en: 'Could not update the status.' }[locale]);
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
            toast.error({ de: 'Löschen fehlgeschlagen.', en: 'Could not delete the testimonial.' }[locale]);
            setDeleteBusy(false);
        }
    }

    async function onSaveImages(fileUploadIds: string[]): Promise<boolean> {
        const result = await updateImages({ customerTestimonialId, imageFileUploadIds: fileUploadIds });
        return Boolean(result.data?.admin.customerTestimonialImageUpdate.success) && !result.error;
    }

    const crumbLabel = testimonial?.displayAuthorName || adminCustomerTestimonialPageTitle[locale];
    const formBusy = isSubmitting || publishBusy || deleteBusy;

    return (
        <AdminPageChrome
            crumbs={[{ label: listRoute.title[locale], to: '/{-$locale}/admin/testimonials' }, { label: crumbLabel }]}
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
                                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                                    </Button>
                                    <Button type="submit" form={FORM_ID} disabled={formBusy || !isDirty}>
                                        {isSubmitting
                                            ? { de: 'Speichern…', en: 'Saving…' }[locale]
                                            : { de: 'Speichern', en: 'Save' }[locale]}
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
                                                aria-label={{ de: 'Weitere Aktionen', en: 'More actions' }[locale]}
                                            >
                                                <MoreHorizontalIcon className="size-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {testimonial.publicationStatus === 'PUBLISHED' ? (
                                                <DropdownMenuItem disabled={publishBusy} onSelect={() => setConfirm('unpublish')}>
                                                    {{ de: 'Zurückziehen', en: 'Unpublish' }[locale]}
                                                </DropdownMenuItem>
                                            ) : null}
                                            <DropdownMenuItem
                                                variant="destructive"
                                                disabled={deleteBusy}
                                                onSelect={() => setConfirm('delete')}
                                            >
                                                {{ de: 'Löschen', en: 'Delete' }[locale]}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <Button type="button" variant="outline" onClick={() => setPreviewOpen(true)}>
                                        {{ de: 'Öffentliche Ansicht', en: 'Public view' }[locale]}
                                    </Button>
                                    {testimonial.publicationStatus !== 'PUBLISHED' ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={publishBusy}
                                            onClick={() => setConfirm('publish')}
                                        >
                                            {{ de: 'Veröffentlichen', en: 'Publish' }[locale]}
                                        </Button>
                                    ) : null}
                                    <Button type="button" disabled={formBusy} onClick={onStartEdit}>
                                        {{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                                    </Button>
                                </>
                            )
                        }
                    >
                        <div className="grid gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="font-serif text-3xl/tight text-foreground">{testimonial.displayAuthorName}</h1>
                                <Badge variant={testimonial.publicationStatus === 'PUBLISHED' ? 'default' : 'secondary'}>
                                    {testimonialPublicationStatusLabel(testimonial.publicationStatus, locale)}
                                </Badge>
                            </div>
                            <TestimonialRatingStars rating={testimonial.rating} />
                            <p className="text-sm text-muted-foreground">
                                {formatDate(testimonial.createdAt, { locale, timeZone, dateStyle: 'medium' })}
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <h2 className="text-sm font-medium text-foreground">{{ de: 'Eingereicht von', en: 'Submitted by' }[locale]}</h2>
                            <div className="flex flex-wrap items-center gap-3 text-sm">
                                <Link
                                    to="/{-$locale}/admin/users/$userId"
                                    params={{ userId: testimonial.user.userId }}
                                    className="text-foreground hover:underline"
                                >
                                    {userDisplayName(testimonial.user)} ({testimonial.user.emailAddress})
                                </Link>
                                {testimonial.bookingRequestOfferId ? (
                                    <AdminTestimonialOfferLink bookingRequestOfferId={testimonial.bookingRequestOfferId} />
                                ) : (
                                    <span className="text-muted-foreground">{{ de: 'Nicht verknüpft', en: 'Not linked' }[locale]}</span>
                                )}
                            </div>
                        </div>

                        <AdminTestimonialPublicPagePlacementsSection placements={testimonial.publicPagePlacements} />

                        {editing ? (
                            <form
                                id={FORM_ID}
                                className="grid gap-4"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    void form.handleSubmit();
                                }}
                            >
                                <h2 className="text-sm font-medium text-foreground">{{ de: 'Inhalt', en: 'Content' }[locale]}</h2>
                                <form.Field name="authorName">
                                    {(field) => (
                                        <div className="grid gap-1.5">
                                            <label htmlFor={field.name} className="text-sm font-medium">
                                                {{ de: 'Name (Override)', en: 'Name (override)' }[locale]}
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
                                                {{ de: 'Ort (Override)', en: 'Location (override)' }[locale]}
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
                                                {{ de: 'Anlass (Override)', en: 'Occasion (override)' }[locale]}
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
                                                {{ de: 'Text', en: 'Body' }[locale]}
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
                                                <span className="text-sm font-medium">{{ de: 'Bewertung', en: 'Rating' }[locale]}</span>
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
                        ) : (
                            <section className="grid gap-4">
                                <h2 className="text-sm font-medium text-foreground">{{ de: 'Inhalt', en: 'Content' }[locale]}</h2>
                                <dl className="grid gap-4">
                                    <DetailField label={{ de: 'Name', en: 'Name' }[locale]} value={testimonial.displayAuthorName} />
                                    <DetailField
                                        label={{ de: 'Ort', en: 'Location' }[locale]}
                                        value={testimonial.displayLocation?.trim() ? testimonial.displayLocation : empty}
                                    />
                                    <DetailField
                                        label={{ de: 'Anlass', en: 'Occasion' }[locale]}
                                        value={testimonial.displayOccasion?.trim() ? testimonial.displayOccasion : empty}
                                    />
                                    <DetailField
                                        label={{ de: 'Text', en: 'Body' }[locale]}
                                        value={testimonial.body.trim() ? testimonial.body : empty}
                                    />
                                    <DetailField
                                        label={{ de: 'Bewertung', en: 'Rating' }[locale]}
                                        value={<TestimonialRatingStars rating={testimonial.rating} />}
                                    />
                                </dl>
                            </section>
                        )}

                        <div className="grid gap-3">
                            <h2 className="text-sm font-medium text-foreground">{{ de: 'Bilder', en: 'Images' }[locale]}</h2>
                            {editing ? (
                                <AdminTestimonialImageManager imageUrls={testimonial.imageUrls} onSave={onSaveImages} />
                            ) : testimonial.imageUrls.length > 0 ? (
                                <div className="grid grid-cols-4 gap-2">
                                    {testimonial.imageUrls.map((url) => (
                                        <img key={url} src={url} alt="" className="aspect-square w-full object-cover" />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    {{ de: 'Noch keine Bilder.', en: 'No images yet.' }[locale]}
                                </p>
                            )}
                        </div>
                    </AdminPinnedFooterLayout>

                    <PageTestimonialDetailDialog
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
                                <AlertDialogTitle>{{ de: 'Jetzt veröffentlichen?', en: 'Publish now?' }[locale]}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {
                                        {
                                            de: 'Die Bewertung wird auf öffentlichen Seiten sichtbar, sofern sie kuratiert oder dem Koch zugeordnet ist.',
                                            en: 'The review becomes visible on public pages where it is curated or linked to the cook.',
                                        }[locale]
                                    }
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={publishBusy}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                                <AlertDialogAction disabled={publishBusy} onClick={() => void onConfirmPublish('PUBLISHED')}>
                                    {{ de: 'Veröffentlichen', en: 'Publish' }[locale]}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog open={confirm === 'unpublish'} onOpenChange={(open) => !open && setConfirm(null)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                    {{ de: 'Veröffentlichung zurückziehen?', en: 'Unpublish this review?' }[locale]}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    {
                                        {
                                            de: 'Die Bewertung verschwindet von öffentlichen Seiten, bis sie erneut veröffentlicht wird.',
                                            en: 'The review will disappear from public pages until it is published again.',
                                        }[locale]
                                    }
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={publishBusy}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                                <AlertDialogAction disabled={publishBusy} onClick={() => void onConfirmPublish('PENDING_REVIEW')}>
                                    {{ de: 'Zurückziehen', en: 'Unpublish' }[locale]}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog open={confirm === 'delete'} onOpenChange={(open) => !open && setConfirm(null)}>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{{ de: 'Bewertung löschen?', en: 'Delete this testimonial?' }[locale]}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {
                                        {
                                            de: 'Dies entfernt die Bewertung dauerhaft und aus allen Kurationslisten.',
                                            en: 'This permanently removes the testimonial and any curation entries.',
                                        }[locale]
                                    }
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={deleteBusy}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                                <AlertDialogAction variant="destructive" disabled={deleteBusy} onClick={() => void onDelete()}>
                                    {{ de: 'Löschen', en: 'Delete' }[locale]}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </>
            ) : (
                <main id="main-content" className="grid w-full content-start gap-8">
                    <p className="text-sm text-muted-foreground">
                        {{ de: 'Bewertung nicht gefunden.', en: 'Testimonial not found.' }[locale]}
                    </p>
                </main>
            )}
        </AdminPageChrome>
    );
}
