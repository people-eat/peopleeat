import { useForm, useSelector } from '@tanstack/react-form';
import { Link } from '@tanstack/react-router';
import { ExternalLinkIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { fileUploadPublicUrl, isTestimonialRating } from '../../shared';
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
import type { Locale } from '../utils/locale';
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
import { Avatar, AvatarFallback, AvatarImage } from './base/avatar';
import { Button } from './base/button';
import { Input } from './base/input';
import { StatusAlert } from './base/status-alert';
import { StatusBadge } from './base/status-badge';
import { Textarea } from './base/textarea';
import { PageTestimonialCardFace } from './PageTestimonialCard';
import { TestimonialRatingInput } from './TestimonialRatingInput';

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

export type AdminOfferTestimonialParty = {
    displayName: string;
    profilePictureUrl?: string | null;
};

function initialsFromName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

function formValuesFromExisting(existing: AdminOfferTestimonial | null): TestimonialFormValues {
    return {
        authorName: existing?.authorName ?? '',
        location: existing?.location ?? '',
        occasion: existing?.occasion ?? '',
        body: existing?.body ?? '',
        rating: existing?.rating ?? null,
    };
}

function fieldErrorText(errors: unknown[]): string | undefined {
    const first = errors[0];
    return typeof first === 'string' && first.length > 0 ? first : undefined;
}

function requiredBody(value: string, locale: Locale): string | undefined {
    if (value.trim().length === 0) {
        return { de: 'Bitte gib einen Text ein.', en: 'Please enter a review text.' }[locale];
    }
    return undefined;
}

function requiredRating(value: number | null, locale: Locale): string | undefined {
    if (!isTestimonialRating(value)) {
        return { de: 'Bitte wähle eine Sternebewertung.', en: 'Please choose a star rating.' }[locale];
    }
    return undefined;
}

export function AdminBookingRequestOfferTestimonialsSection({
    bookingRequestOfferId,
    bookingRequestUserId,
    cookId,
    customerTestimonial,
    cookTestimonial,
    customerParty,
    cookParty,
}: {
    bookingRequestOfferId: string;
    bookingRequestUserId: string;
    cookId: string;
    customerTestimonial: AdminOfferTestimonial | null;
    cookTestimonial: AdminOfferTestimonial | null;
    customerParty?: AdminOfferTestimonialParty | null;
    cookParty?: AdminOfferTestimonialParty | null;
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
        <section className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <TestimonialSide
                title={{ de: 'Kunde → Koch', en: 'Customer → cook' }[locale]}
                kind="customer"
                party={customerParty}
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
                            imageFileUploadIds: value.imageFileUploadIds,
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

            <TestimonialSide
                title={{ de: 'Koch → Gast', en: 'Cook → guest' }[locale]}
                kind="cook"
                party={cookParty}
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
                            imageFileUploadIds: value.imageFileUploadIds,
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

type TestimonialCreateValues = TestimonialFormValues & {
    imageFileUploadIds: string[];
};

function TestimonialSide({
    title,
    kind,
    party,
    existing,
    bodyRequired,
    onCreate,
    onUpdate,
    onPublish,
    onDelete,
    onSaveImages,
}: {
    title: string;
    kind: 'customer' | 'cook';
    party?: AdminOfferTestimonialParty | null;
    existing: AdminOfferTestimonial | null;
    bodyRequired: boolean;
    onCreate: (value: TestimonialCreateValues) => Promise<boolean>;
    onUpdate: (id: string, value: TestimonialFormValues) => Promise<boolean>;
    onPublish: (id: string, status: 'PUBLISHED' | 'PENDING_REVIEW') => Promise<boolean>;
    onDelete: (id: string) => Promise<boolean>;
    onSaveImages: (id: string, fileUploadIds: string[]) => Promise<boolean>;
}) {
    const locale = useLocale();
    const [editing, setEditing] = useState(false);
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState<'publish' | 'unpublish' | 'delete' | null>(null);
    const [draftImageIds, setDraftImageIds] = useState<string[]>([]);

    const form = useForm({
        defaultValues: formValuesFromExisting(existing) satisfies TestimonialFormValues,
        onSubmit: async ({ value }) => {
            const input: TestimonialFormValues = {
                authorName: value.authorName.trim(),
                location: value.location.trim(),
                occasion: value.occasion.trim(),
                body: value.body.trim(),
                rating: value.rating,
            };
            const success = existing ? await onUpdate(existing.id, input) : await onCreate({ ...input, imageFileUploadIds: draftImageIds });
            if (!success) {
                toast.error({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }[locale]);
                return;
            }
            toast.success({ de: 'Gespeichert.', en: 'Saved.' }[locale]);
            setDraftImageIds([]);
            setEditing(false);
        },
    });
    const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
    const submissionAttempts = useSelector(form.store, (state) => state.submissionAttempts);

    function startEditing() {
        form.reset(formValuesFromExisting(existing));
        setEditing(true);
    }

    function cancelEditing() {
        form.reset(formValuesFromExisting(existing));
        setEditing(false);
    }

    async function onConfirmPublish(next: 'PUBLISHED' | 'PENDING_REVIEW') {
        if (!existing || busy) return;
        setBusy(true);
        try {
            if (!(await onPublish(existing.id, next))) throw new Error('publish failed');
            setConfirm(null);
            toast.success(
                next === 'PUBLISHED'
                    ? { de: 'Veröffentlicht.', en: 'Published.' }[locale]
                    : { de: 'Zurückgezogen.', en: 'Unpublished.' }[locale],
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
            setEditing(false);
        } catch {
            toast.error({ de: 'Löschen fehlgeschlagen.', en: 'Could not delete the testimonial.' }[locale]);
        } finally {
            setBusy(false);
        }
    }

    const partyName = party?.displayName?.trim() || null;
    const partyPictureUrl = party?.profilePictureUrl ?? null;
    const showForm = existing == null || editing;
    const publicationTone = existing?.publicationStatus === 'PUBLISHED' ? 'success' : 'warning';
    const optionalHint = { de: 'optional', en: 'optional' }[locale];
    const bodyHint = bodyRequired ? { de: 'erforderlich', en: 'required' }[locale] : optionalHint;

    return (
        <div className="grid gap-4 rounded-lg border border-border/60 bg-card p-4 text-card-foreground">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="grid min-w-0 gap-2">
                    <h3 className="text-sm font-medium text-foreground">{title}</h3>
                    {partyName ? (
                        <div className="flex min-w-0 items-center gap-2">
                            <Avatar className="size-8 shrink-0">
                                {partyPictureUrl ? <AvatarImage src={partyPictureUrl} alt="" /> : null}
                                <AvatarFallback className="text-[10px]">{initialsFromName(partyName)}</AvatarFallback>
                            </Avatar>
                            <span className="truncate text-sm text-muted-foreground">{partyName}</span>
                        </div>
                    ) : null}
                </div>
                {existing ? (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <StatusBadge tone={publicationTone}>
                            {testimonialPublicationStatusLabel(existing.publicationStatus, locale)}
                        </StatusBadge>
                        <Link
                            to={
                                kind === 'customer'
                                    ? '/{-$locale}/admin/testimonials/customer/$customerTestimonialId'
                                    : '/{-$locale}/admin/testimonials/cook/$cookTestimonialId'
                            }
                            params={kind === 'customer' ? { customerTestimonialId: existing.id } : { cookTestimonialId: existing.id }}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                        >
                            <ExternalLinkIcon className="size-3.5" aria-hidden />
                            {{ de: 'Bewertungsseite', en: 'Review page' }[locale]}
                        </Link>
                    </div>
                ) : null}
            </div>

            {existing && !editing ? (
                <>
                    <PageTestimonialCardFace
                        testimonial={{
                            authorName: existing.displayAuthorName,
                            location: existing.displayLocation,
                            occasion: existing.displayOccasion,
                            body: existing.body.trim() || { de: '(ohne Text)', en: '(no body)' }[locale],
                            rating: existing.rating,
                            imageUrls: [],
                        }}
                    />
                    {existing.lowRatingAnswers?.whatWentWrong ? (
                        <StatusAlert tone="warning" title={{ de: 'Niedrige Bewertung', en: 'Low rating' }[locale]}>
                            {existing.lowRatingAnswers.whatWentWrong}
                        </StatusAlert>
                    ) : null}
                    <div className="grid gap-1.5">
                        <span className="text-sm font-medium text-foreground">{{ de: 'Fotos', en: 'Photos' }[locale]}</span>
                        <AdminTestimonialImageManager imageUrls={existing.imageUrls} onSave={(ids) => onSaveImages(existing.id, ids)} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={startEditing}>
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
                                ? { de: 'Zurückziehen', en: 'Unpublish' }[locale]
                                : { de: 'Veröffentlichen', en: 'Publish' }[locale]}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={busy}
                            onClick={() => setConfirm('delete')}
                        >
                            {{ de: 'Löschen', en: 'Delete' }[locale]}
                        </Button>
                    </div>
                </>
            ) : null}

            {showForm ? (
                <form
                    className="grid gap-3"
                    onSubmit={(event) => {
                        event.preventDefault();
                        void form.handleSubmit();
                    }}
                >
                    <form.Field
                        name="rating"
                        validators={{
                            onSubmit: ({ value }) => requiredRating(value, locale),
                        }}
                    >
                        {(field) => {
                            const errorMessage = fieldErrorText(field.state.meta.errors);
                            const showError = errorMessage != null && submissionAttempts > 0;
                            const errorId = `${title}-rating-error`;
                            return (
                                <div className="grid gap-1.5">
                                    <span className="text-sm font-medium text-foreground">
                                        {{ de: 'Bewertung', en: 'Rating' }[locale]}
                                        <span className="font-normal text-muted-foreground">
                                            {' '}
                                            ({{ de: 'erforderlich', en: 'required' }[locale]})
                                        </span>
                                    </span>
                                    <div aria-invalid={showError} aria-describedby={showError ? errorId : undefined}>
                                        <TestimonialRatingInput
                                            value={field.state.value}
                                            onChange={(next) => field.handleChange(next)}
                                            size="sm"
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
                    <div className="grid gap-3 sm:grid-cols-2">
                        <form.Field name="authorName">
                            {(field) => (
                                <div className="grid gap-1.5">
                                    <label htmlFor={`${title}-authorName`} className="text-sm font-medium text-foreground">
                                        {{ de: 'Name', en: 'Name' }[locale]}
                                        <span className="font-normal text-muted-foreground"> ({optionalHint})</span>
                                    </label>
                                    <Input
                                        id={`${title}-authorName`}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(event) => field.handleChange(event.target.value)}
                                    />
                                </div>
                            )}
                        </form.Field>
                        <form.Field name="location">
                            {(field) => (
                                <div className="grid gap-1.5">
                                    <label htmlFor={`${title}-location`} className="text-sm font-medium text-foreground">
                                        {{ de: 'Ort', en: 'Location' }[locale]}
                                        <span className="font-normal text-muted-foreground"> ({optionalHint})</span>
                                    </label>
                                    <Input
                                        id={`${title}-location`}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(event) => field.handleChange(event.target.value)}
                                    />
                                </div>
                            )}
                        </form.Field>
                    </div>
                    <form.Field name="occasion">
                        {(field) => (
                            <div className="grid gap-1.5">
                                <label htmlFor={`${title}-occasion`} className="text-sm font-medium text-foreground">
                                    {{ de: 'Anlass', en: 'Occasion' }[locale]}
                                    <span className="font-normal text-muted-foreground"> ({optionalHint})</span>
                                </label>
                                <Input
                                    id={`${title}-occasion`}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                />
                            </div>
                        )}
                    </form.Field>
                    <form.Field
                        name="body"
                        validators={{
                            onSubmit: ({ value }) => (bodyRequired ? requiredBody(value, locale) : undefined),
                        }}
                    >
                        {(field) => {
                            const errorMessage = fieldErrorText(field.state.meta.errors);
                            const showError = errorMessage != null && submissionAttempts > 0;
                            const errorId = `${title}-body-error`;
                            return (
                                <div className="grid gap-1.5">
                                    <label htmlFor={`${title}-body`} className="text-sm font-medium text-foreground">
                                        {{ de: 'Text', en: 'Body' }[locale]}
                                        <span className="font-normal text-muted-foreground"> ({bodyHint})</span>
                                    </label>
                                    <Textarea
                                        id={`${title}-body`}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(event) => field.handleChange(event.target.value)}
                                        rows={3}
                                        aria-invalid={showError}
                                        aria-describedby={showError ? errorId : undefined}
                                    />
                                    {showError ? (
                                        <p id={errorId} className="text-sm text-destructive" role="alert">
                                            {errorMessage}
                                        </p>
                                    ) : null}
                                </div>
                            );
                        }}
                    </form.Field>

                    <div className="grid gap-1.5">
                        <span className="text-sm font-medium text-foreground">{{ de: 'Fotos', en: 'Photos' }[locale]}</span>
                        {existing ? (
                            <AdminTestimonialImageManager imageUrls={existing.imageUrls} onSave={(ids) => onSaveImages(existing.id, ids)} />
                        ) : (
                            <AdminTestimonialImageManager
                                imageUrls={draftImageIds.map(fileUploadPublicUrl)}
                                onSave={async (ids) => {
                                    setDraftImageIds(ids);
                                    return true;
                                }}
                            />
                        )}
                    </div>

                    <div className={existing ? 'flex flex-wrap gap-2 pt-1' : 'flex flex-wrap gap-2'}>
                        <Button type="submit" size="sm" disabled={isSubmitting}>
                            {existing ? { de: 'Speichern', en: 'Save' }[locale] : { de: 'Anlegen', en: 'Create' }[locale]}
                        </Button>
                        {existing ? (
                            <Button type="button" size="sm" variant="outline" disabled={isSubmitting} onClick={cancelEditing}>
                                {{ de: 'Abbrechen', en: 'Cancel' }[locale]}
                            </Button>
                        ) : null}
                    </div>
                </form>
            ) : null}

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
                        <AlertDialogCancel disabled={busy}>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                        <AlertDialogAction disabled={busy} onClick={() => void onConfirmPublish('PENDING_REVIEW')}>
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
