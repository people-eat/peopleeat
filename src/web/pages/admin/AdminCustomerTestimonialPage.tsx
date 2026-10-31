import { useForm, useSelector } from '@tanstack/react-form';
import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { createRequest, useClient, useMutation } from 'urql';
import { pipe, subscribe } from 'wonka';

import { formatDate, userDisplayName } from '../../../shared';
import { AdminPageChrome } from '../../components/AdminPageChrome';
import { AdminTestimonialOfferLink } from '../../components/AdminTestimonialOfferLink';
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
import { Input } from '../../components/base/input';
import { Separator } from '../../components/base/separator';
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
import { adminStubRouteBySlug } from './adminCatalog';
import { AdminTestimonialImageManager } from './AdminTestimonialImageManager';
import { testimonialPublicationStatusLabel } from './adminTestimonialsShared';

const listRoute = adminStubRouteBySlug('testimonials');

export const adminCustomerTestimonialPageTitle = { de: 'Kundenbewertung', en: 'Customer testimonial' } as const;
export const adminCustomerTestimonialPageDescription = {
    de: 'Kundenbewertung bearbeiten, veröffentlichen oder löschen.',
    en: 'Edit, publish, or delete a customer testimonial.',
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
    const [publishBusy, setPublishBusy] = useState(false);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [confirm, setConfirm] = useState<'publish' | 'unpublish' | 'delete' | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);

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
        },
    });
    const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

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
                    form.reset(formFromTestimonial(next));
                }
            }),
        );
        return unsubscribe;
    }, [client, customerTestimonialId, seed]);

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
                    : { de: 'Zurückgestellt.', en: 'Unpublished.' }[locale],
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

    return (
        <AdminPageChrome crumbs={[{ label: listRoute.title[locale], to: '/{-$locale}/admin/testimonials' }, { label: crumbLabel }]}>
            <main id="main-content" className="grid w-full content-start gap-8">
                {testimonial ? (
                    <>
                        <div className="flex flex-wrap items-start justify-between gap-4">
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
                            <div className="flex flex-wrap gap-2">
                                <Button type="button" variant="outline" onClick={() => setPreviewOpen(true)}>
                                    {{ de: 'Öffentliche Ansicht', en: 'Public view' }[locale]}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={publishBusy}
                                    onClick={() => setConfirm(testimonial.publicationStatus === 'PUBLISHED' ? 'unpublish' : 'publish')}
                                >
                                    {testimonial.publicationStatus === 'PUBLISHED'
                                        ? { de: 'Zurückstellen', en: 'Unpublish' }[locale]
                                        : { de: 'Veröffentlichen', en: 'Publish' }[locale]}
                                </Button>
                                <Button type="button" variant="destructive" disabled={deleteBusy} onClick={() => setConfirm('delete')}>
                                    {{ de: 'Löschen', en: 'Delete' }[locale]}
                                </Button>
                            </div>
                        </div>

                        <PageTestimonialDetailDialog
                            testimonial={{
                                authorName: testimonial.displayAuthorName,
                                location: testimonial.displayLocation,
                                occasion: testimonial.displayOccasion,
                                body: testimonial.body,
                                rating: testimonial.rating ?? null,
                                imageUrls: testimonial.imageUrls,
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
                                    <AlertDialogCancel disabled={publishBusy}>
                                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                                    </AlertDialogCancel>
                                    <AlertDialogAction disabled={publishBusy} onClick={() => void onConfirmPublish('PUBLISHED')}>
                                        {{ de: 'Veröffentlichen', en: 'Publish' }[locale]}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog open={confirm === 'unpublish'} onOpenChange={(open) => !open && setConfirm(null)}>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>{{ de: 'Zurückstellen?', en: 'Unpublish?' }[locale]}</AlertDialogTitle>
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
                                    <AlertDialogCancel disabled={publishBusy}>
                                        {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                                    </AlertDialogCancel>
                                    <AlertDialogAction disabled={publishBusy} onClick={() => void onConfirmPublish('PENDING_REVIEW')}>
                                        {{ de: 'Zurückstellen', en: 'Unpublish' }[locale]}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog open={confirm === 'delete'} onOpenChange={(open) => !open && setConfirm(null)}>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        {{ de: 'Bewertung löschen?', en: 'Delete this testimonial?' }[locale]}
                                    </AlertDialogTitle>
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

                        <div className="grid gap-2">
                            <h2 className="text-sm font-medium text-foreground">{{ de: 'Herkunft', en: 'Source' }[locale]}</h2>
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

                        <Separator />

                        <form
                            className="grid max-w-xl gap-4"
                            onSubmit={(event) => {
                                event.preventDefault();
                                void form.handleSubmit();
                            }}
                        >
                            <h2 className="text-sm font-medium text-foreground">{{ de: 'Bearbeiten', en: 'Edit' }[locale]}</h2>
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
                            <form.Field name="rating">
                                {(field) => (
                                    <div className="grid gap-1.5">
                                        <span className="text-sm font-medium">{{ de: 'Bewertung', en: 'Rating' }[locale]}</span>
                                        <TestimonialRatingInput
                                            value={field.state.value}
                                            onChange={(next) => field.handleChange(next)}
                                            allowClear
                                        />
                                    </div>
                                )}
                            </form.Field>
                            <div>
                                <Button type="submit" disabled={isSubmitting}>
                                    {{ de: 'Speichern', en: 'Save' }[locale]}
                                </Button>
                            </div>
                        </form>

                        <Separator />

                        <div className="grid max-w-xl gap-3">
                            <h2 className="text-sm font-medium text-foreground">{{ de: 'Bilder', en: 'Images' }[locale]}</h2>
                            <AdminTestimonialImageManager imageUrls={testimonial.imageUrls} onSave={onSaveImages} />
                        </div>
                    </>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        {{ de: 'Bewertung nicht gefunden.', en: 'Testimonial not found.' }[locale]}
                    </p>
                )}
            </main>
        </AdminPageChrome>
    );
}
