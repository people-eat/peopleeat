import { useForm, useSelector } from '@tanstack/react-form';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import {
    AdminCookTestimonialCreateDocument,
    AdminCookTestimonialDeleteDocument,
    AdminCookTestimonialDetailImageUpdateDocument,
    AdminCookTestimonialDetailUpdateDocument,
    AdminCookTestimonialPublishDocument,
    AdminCustomerTestimonialCreateDocument,
    AdminCustomerTestimonialDeleteDocument,
    AdminCustomerTestimonialDetailImageUpdateDocument,
    AdminCustomerTestimonialDetailUpdateDocument,
    AdminCustomerTestimonialPublishDocument,
} from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { AdminTestimonialImageManager } from '../pages/admin/AdminTestimonialImageManager';
import { testimonialPublicationStatusLabel } from '../pages/admin/adminTestimonialsShared';
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
import { Badge } from './base/badge';
import { Button } from './base/button';
import { Input } from './base/input';
import { Separator } from './base/separator';
import { StatusAlert } from './base/status-alert';
import { Textarea } from './base/textarea';
import { TestimonialRatingInput } from './TestimonialRatingInput';
import { TestimonialRatingStars } from './TestimonialRatingStars';

export type AdminOfferTestimonial = {
    id: string;
    authorName: string | null;
    displayAuthorName: string;
    location: string | null;
    displayLocation: string | null;
    occasion: string | null;
    displayOccasion: string | null;
    body: string;
    imageUrls: string[];
    rating: number | null;
    publicationStatus: 'PUBLISHED' | 'PENDING_REVIEW';
    lowRatingAnswers?: { whatWentWrong: string | null; wouldRecommend: boolean | null; additionalFeedback: string | null } | null;
};

export function AdminBookingRequestOfferTestimonialsSection({
    bookingRequestOfferId,
    bookingRequestUserId,
    cookId,
    customerTestimonial,
    cookTestimonial,
}: {
    bookingRequestOfferId: string;
    bookingRequestUserId: string;
    cookId: string;
    customerTestimonial: AdminOfferTestimonial | null;
    cookTestimonial: AdminOfferTestimonial | null;
}) {
    const locale = useLocale();
    const [, createCustomer] = useMutation(AdminCustomerTestimonialCreateDocument);
    const [, createCook] = useMutation(AdminCookTestimonialCreateDocument);
    const [, updateCustomer] = useMutation(AdminCustomerTestimonialDetailUpdateDocument);
    const [, updateCook] = useMutation(AdminCookTestimonialDetailUpdateDocument);
    const [, publishCustomer] = useMutation(AdminCustomerTestimonialPublishDocument);
    const [, publishCook] = useMutation(AdminCookTestimonialPublishDocument);
    const [, deleteCustomer] = useMutation(AdminCustomerTestimonialDeleteDocument);
    const [, deleteCook] = useMutation(AdminCookTestimonialDeleteDocument);
    const [, imagesCustomer] = useMutation(AdminCustomerTestimonialDetailImageUpdateDocument);
    const [, imagesCook] = useMutation(AdminCookTestimonialDetailImageUpdateDocument);

    return (
        <section className="grid gap-4 rounded-lg border border-border/60 p-4">
            <h2 className="text-sm font-medium text-foreground">{{ de: 'Bewertungen', en: 'Reviews' }[locale]}</h2>

            <TestimonialSide
                title={{ de: 'Kunde → Koch', en: 'Customer → cook' }[locale]}
                existing={customerTestimonial}
                bodyRequired
                onCreate={async (value) => {
                    const result = await createCustomer({
                        input: {
                            userId: bookingRequestUserId,
                            bookingRequestOfferId,
                            authorName: value.authorName || null,
                            location: value.location || null,
                            occasion: value.occasion || null,
                            body: value.body,
                            rating: value.rating,
                        },
                    });
                    if (result.error || !result.data?.admin.customerTestimonialCreate.success) {
                        toast.error({ de: 'Anlegen fehlgeschlagen.', en: 'Could not create the review.' }[locale]);
                        return false;
                    }
                    return true;
                }}
                onUpdate={async (id, value) => {
                    const result = await updateCustomer({
                        customerTestimonialId: id,
                        input: {
                            authorName: value.authorName || null,
                            location: value.location || null,
                            occasion: value.occasion || null,
                            body: value.body,
                            rating: value.rating,
                        },
                    });
                    return Boolean(result.data?.admin.customerTestimonialUpdate.success) && !result.error;
                }}
                onPublish={async (id, status) => {
                    const result = await publishCustomer({ customerTestimonialId: id, publicationStatus: status });
                    return Boolean(result.data?.admin.customerTestimonialPublish.success) && !result.error;
                }}
                onDelete={async (id) => {
                    const result = await deleteCustomer({ customerTestimonialId: id });
                    return Boolean(result.data?.admin.customerTestimonialDelete.success) && !result.error;
                }}
                onSaveImages={async (id, fileUploadIds) => {
                    const result = await imagesCustomer({ customerTestimonialId: id, imageFileUploadIds: fileUploadIds });
                    return Boolean(result.data?.admin.customerTestimonialImageUpdate.success) && !result.error;
                }}
            />

            <Separator />

            <TestimonialSide
                title={{ de: 'Koch → Gast', en: 'Cook → guest' }[locale]}
                existing={cookTestimonial}
                bodyRequired={false}
                onCreate={async (value) => {
                    const result = await createCook({
                        input: {
                            cookId,
                            bookingRequestOfferId,
                            authorName: value.authorName || null,
                            location: value.location || null,
                            occasion: value.occasion || null,
                            body: value.body || null,
                            rating: value.rating,
                        },
                    });
                    if (result.error || !result.data?.admin.cookTestimonialCreate.success) {
                        toast.error({ de: 'Anlegen fehlgeschlagen.', en: 'Could not create the review.' }[locale]);
                        return false;
                    }
                    return true;
                }}
                onUpdate={async (id, value) => {
                    const result = await updateCook({
                        cookTestimonialId: id,
                        input: {
                            authorName: value.authorName || null,
                            location: value.location || null,
                            occasion: value.occasion || null,
                            body: value.body || null,
                            rating: value.rating,
                        },
                    });
                    return Boolean(result.data?.admin.cookTestimonialUpdate.success) && !result.error;
                }}
                onPublish={async (id, status) => {
                    const result = await publishCook({ cookTestimonialId: id, publicationStatus: status });
                    return Boolean(result.data?.admin.cookTestimonialPublish.success) && !result.error;
                }}
                onDelete={async (id) => {
                    const result = await deleteCook({ cookTestimonialId: id });
                    return Boolean(result.data?.admin.cookTestimonialDelete.success) && !result.error;
                }}
                onSaveImages={async (id, fileUploadIds) => {
                    const result = await imagesCook({ cookTestimonialId: id, imageFileUploadIds: fileUploadIds });
                    return Boolean(result.data?.admin.cookTestimonialImageUpdate.success) && !result.error;
                }}
            />
        </section>
    );
}

type TestimonialFormValues = {
    authorName: string;
    location: string;
    occasion: string;
    body: string;
    rating: number | null;
};

function TestimonialSide({
    title,
    existing,
    bodyRequired,
    onCreate,
    onUpdate,
    onPublish,
    onDelete,
    onSaveImages,
}: {
    title: string;
    existing: AdminOfferTestimonial | null;
    bodyRequired: boolean;
    onCreate: (value: TestimonialFormValues) => Promise<boolean>;
    onUpdate: (id: string, value: TestimonialFormValues) => Promise<boolean>;
    onPublish: (id: string, status: 'PUBLISHED' | 'PENDING_REVIEW') => Promise<boolean>;
    onDelete: (id: string) => Promise<boolean>;
    onSaveImages: (id: string, fileUploadIds: string[]) => Promise<boolean>;
}) {
    const locale = useLocale();
    const [editing, setEditing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState<'publish' | 'unpublish' | 'delete' | null>(null);

    const form = useForm({
        defaultValues: {
            authorName: existing?.authorName ?? '',
            location: existing?.location ?? '',
            occasion: existing?.occasion ?? '',
            body: existing?.body ?? '',
            rating: existing?.rating ?? null,
        } satisfies TestimonialFormValues,
        onSubmit: async ({ value }) => {
            const input: TestimonialFormValues = {
                authorName: value.authorName.trim(),
                location: value.location.trim(),
                occasion: value.occasion.trim(),
                body: value.body.trim(),
                rating: value.rating,
            };
            const success = existing ? await onUpdate(existing.id, input) : await onCreate(input);
            if (!success) {
                toast.error({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }[locale]);
                return;
            }
            toast.success({ de: 'Gespeichert.', en: 'Saved.' }[locale]);
            setEditing(false);
        },
    });
    const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);

    async function onConfirmPublish(next: 'PUBLISHED' | 'PENDING_REVIEW') {
        if (!existing || busy) return;
        setBusy(true);
        try {
            if (!(await onPublish(existing.id, next))) throw new Error('publish failed');
            setConfirm(null);
            toast.success(
                next === 'PUBLISHED'
                    ? { de: 'Veröffentlicht.', en: 'Published.' }[locale]
                    : { de: 'Zurückgestellt.', en: 'Unpublished.' }[locale],
            );
        } catch {
            toast.error({ de: 'Status konnte nicht geändert werden.', en: 'Could not update the status.' }[locale]);
        } finally {
            setBusy(false);
        }
    }

    async function onConfirmDelete() {
        if (!existing) return;
        setBusy(true);
        try {
            if (!(await onDelete(existing.id))) throw new Error('delete failed');
            setConfirm(null);
        } catch {
            toast.error({ de: 'Löschen fehlgeschlagen.', en: 'Could not delete the testimonial.' }[locale]);
        } finally {
            setBusy(false);
        }
    }

    if (existing && !editing) {
        return (
            <div className="grid gap-2 rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-medium text-foreground">{title}</h3>
                    <Badge variant={existing.publicationStatus === 'PUBLISHED' ? 'default' : 'secondary'}>
                        {testimonialPublicationStatusLabel(existing.publicationStatus, locale)}
                    </Badge>
                </div>
                <p className="text-sm font-medium">{existing.displayAuthorName}</p>
                <TestimonialRatingStars rating={existing.rating} />
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                    {existing.body || { de: '(ohne Text)', en: '(no body)' }[locale]}
                </p>
                {existing.lowRatingAnswers?.whatWentWrong ? (
                    <StatusAlert tone="warning" title={{ de: 'Niedrige Bewertung', en: 'Low rating' }[locale]}>
                        {existing.lowRatingAnswers.whatWentWrong}
                    </StatusAlert>
                ) : null}
                <AdminTestimonialImageManager imageUrls={existing.imageUrls} onSave={(ids) => onSaveImages(existing.id, ids)} />
                <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setEditing(true)}>
                        {{ de: 'Bearbeiten', en: 'Edit' }[locale]}
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => setConfirm(existing.publicationStatus === 'PUBLISHED' ? 'unpublish' : 'publish')}
                    >
                        {existing.publicationStatus === 'PUBLISHED'
                            ? { de: 'Zurückstellen', en: 'Unpublish' }[locale]
                            : { de: 'Veröffentlichen', en: 'Publish' }[locale]}
                    </Button>
                    <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => setConfirm('delete')}>
                        {{ de: 'Löschen', en: 'Delete' }[locale]}
                    </Button>
                </div>

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
                            <AlertDialogCancel disabled={busy}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                            <AlertDialogAction disabled={busy} onClick={() => void onConfirmPublish('PUBLISHED')}>
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
                            <AlertDialogCancel disabled={busy}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                            <AlertDialogAction disabled={busy} onClick={() => void onConfirmPublish('PENDING_REVIEW')}>
                                {{ de: 'Zurückstellen', en: 'Unpublish' }[locale]}
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
                            <AlertDialogCancel disabled={busy}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                            <AlertDialogAction variant="destructive" disabled={busy} onClick={() => void onConfirmDelete()}>
                                {{ de: 'Löschen', en: 'Delete' }[locale]}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        );
    }

    return (
        <form
            className="grid gap-2 rounded-md border border-dashed border-border p-3"
            onSubmit={(event) => {
                event.preventDefault();
                void form.handleSubmit();
            }}
        >
            <h3 className="text-sm font-medium text-foreground">{title}</h3>
            <div className="grid gap-2 sm:grid-cols-2">
                <form.Field name="authorName">
                    {(field) => (
                        <Input
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                            placeholder={{ de: 'Name (optional)', en: 'Name (optional)' }[locale]}
                        />
                    )}
                </form.Field>
                <form.Field name="location">
                    {(field) => (
                        <Input
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(event) => field.handleChange(event.target.value)}
                            placeholder={{ de: 'Ort (optional)', en: 'Location (optional)' }[locale]}
                        />
                    )}
                </form.Field>
            </div>
            <form.Field name="occasion">
                {(field) => (
                    <Input
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                        placeholder={{ de: 'Anlass (optional)', en: 'Occasion (optional)' }[locale]}
                    />
                )}
            </form.Field>
            <form.Field name="body">
                {(field) => (
                    <Textarea
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                        rows={3}
                        placeholder={
                            bodyRequired
                                ? { de: 'Text (erforderlich)', en: 'Body (required)' }[locale]
                                : { de: 'Text (optional)', en: 'Body (optional)' }[locale]
                        }
                    />
                )}
            </form.Field>
            <form.Field name="rating">
                {(field) => (
                    <div className="grid gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground">{{ de: 'Bewertung', en: 'Rating' }[locale]}</span>
                        <TestimonialRatingInput
                            value={field.state.value}
                            onChange={(next) => field.handleChange(next)}
                            allowClear
                            size="sm"
                        />
                    </div>
                )}
            </form.Field>
            <form.Subscribe selector={(state) => state.values.body}>
                {(body) => (
                    <div className="flex flex-wrap gap-2">
                        <Button type="submit" size="sm" disabled={isSubmitting || (bodyRequired && body.trim().length === 0)}>
                            {existing ? { de: 'Speichern', en: 'Save' }[locale] : { de: 'Anlegen', en: 'Create' }[locale]}
                        </Button>
                        {existing ? (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isSubmitting}
                                onClick={() => {
                                    form.reset();
                                    setEditing(false);
                                }}
                            >
                                {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                            </Button>
                        ) : null}
                    </div>
                )}
            </form.Subscribe>
        </form>
    );
}
