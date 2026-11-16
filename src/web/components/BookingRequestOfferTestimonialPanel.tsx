import { useForm, useSelector } from '@tanstack/react-form';
import { PlusIcon, XIcon } from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { fileUploadPublicUrl, inlineCopy, isTestimonialRating } from '../../shared';
import { uploadErrorMessage, uploadFile } from '../chat/fileUpload';
import { CookBookingRequestOfferTestimonialUpsertDocument, UserBookingRequestOfferTestimonialUpsertDocument } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import { IMAGE_COMPRESS_PRESETS, IMAGE_CROP_ACCEPT, imageCompress } from '../utils/imageCropCompress';
import type { Locale } from '../utils/locale';
import { Avatar, AvatarFallback, AvatarImage } from './base/avatar';
import { Button } from './base/button';
import { Spinner } from './base/spinner';
import { Textarea } from './base/textarea';
import type { TestimonialCardModel } from './TestimonialCard';
import { TestimonialCardFace, TestimonialDetailDialog } from './TestimonialCard';
import { TestimonialRatingInput } from './TestimonialRatingInput';

export const BOOKING_REQUEST_OFFER_TESTIMONIAL_FORM_ID = 'booking-request-offer-testimonial-form';
export const BOOKING_REQUEST_OFFER_TESTIMONIAL_EDIT_FORM_ID = 'booking-request-offer-testimonial-edit-form';

const GOOGLE_REVIEW_URL = 'https://g.page/r/CTt2r08ker0wEAE/review';
const MAX_IMAGES = 8;

/** `imageUrls` are `/api/file-uploads/{id}` (see `fileUploadPublicUrl`). */
function fileUploadIdFromUrl(url: string): string | null {
    const match = /\/api\/file-uploads\/([^/?#]+)/.exec(url);
    return match?.[1] ?? null;
}

type ExistingTestimonial = {
    body: string;
    rating: number | null;
    imageUrls?: string[];
    authorName?: string;
    authorProfilePictureUrl?: string | null;
    location?: string | null;
    occasion?: string | null;
    createdAt?: string | null;
    publicationStatus?: 'PUBLISHED' | 'PENDING_REVIEW';
};

type AuthorFallback = {
    authorName: string;
    authorProfilePictureUrl?: string | null;
    location?: string | null;
    occasion?: string | null;
};

/** Person being rated (cook for customers, guest for cooks). */
type Counterpart = {
    displayName: string;
    profilePictureUrl?: string | null;
};

function initialsFromName(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
}

type FormValues = {
    rating: number | null;
    body: string;
    imageFileUploadIds: string[];
    whatWentWrong: string;
    wouldRecommend: boolean | null;
    additionalFeedback: string;
};

const EMPTY_FORM_VALUES: FormValues = {
    rating: null,
    body: '',
    imageFileUploadIds: [],
    whatWentWrong: '',
    wouldRecommend: null,
    additionalFeedback: '',
};

function fieldErrorText(errors: unknown[]): string | undefined {
    const first = errors[0];
    return typeof first === 'string' && first.length > 0 ? first : undefined;
}

function requiredRating(value: number | null, locale: Locale): string | undefined {
    if (!isTestimonialRating(value)) {
        return inlineCopy({ de: 'Bitte wähle deine Sterne.', en: 'Please choose your star rating.' }, locale);
    }
    return undefined;
}

function requiredCustomerBody(value: string, locale: Locale): string | undefined {
    if (value.trim().length === 0) {
        return inlineCopy(
            {
                de: 'Bitte schreibe ein paar Worte zu deinem Event.',
                en: 'Please write a few words about your event.',
            },
            locale,
        );
    }
    return undefined;
}

function requiredWhatWentWrong(value: string, locale: Locale): string | undefined {
    if (value.trim().length === 0) {
        return inlineCopy(
            {
                de: 'Bitte beschreibe kurz, was nicht gut lief.',
                en: 'Please briefly describe what did not go well.',
            },
            locale,
        );
    }
    return undefined;
}

function imageIdsFromUrls(imageUrls: string[] | undefined): string[] {
    return (imageUrls ?? []).map(fileUploadIdFromUrl).filter((id): id is string => id != null);
}

function toCardModel(shown: ExistingTestimonial, authorFallback: AuthorFallback): TestimonialCardModel {
    return {
        authorName: shown.authorName?.trim() || authorFallback.authorName,
        authorProfilePictureUrl: shown.authorProfilePictureUrl ?? authorFallback.authorProfilePictureUrl ?? null,
        location: shown.location ?? authorFallback.location ?? null,
        occasion: shown.occasion ?? authorFallback.occasion ?? null,
        body: shown.body,
        rating: shown.rating,
        imageUrls: shown.imageUrls ?? [],
        createdAt: shown.createdAt,
    };
}

/**
 * Rating + body submission for a completed booking request offer, shared by
 * the customer offer page and the cook offer detail page. When `role` is
 * `'cook'` and the chosen rating is below 5, a short structured follow-up
 * (`lowRatingAnswers`) is required — see `cookBookingRequestOfferTestimonialCreate`.
 * After submit, the same fields can be edited in place. Primary submit / edit
 * Save live in the parent pinned footer via the exported form ids.
 */
export function BookingRequestOfferTestimonialPanel({
    bookingRequestOfferId,
    role,
    existing,
    missing,
    authorFallback,
    counterpart,
    editing = false,
    onBusyChange,
    onSubmitted,
    onEditingChange,
}: {
    bookingRequestOfferId: string;
    role: 'customer' | 'cook';
    existing: ExistingTestimonial | null;
    missing: boolean;
    authorFallback: AuthorFallback;
    counterpart: Counterpart;
    editing?: boolean;
    onBusyChange?: (busy: boolean) => void;
    onSubmitted?: () => void;
    onEditingChange?: (editing: boolean) => void;
}) {
    const locale = useLocale();
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploadBusy, setUploadBusy] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState<ExistingTestimonial | null>(null);
    const [localOverride, setLocalOverride] = useState<ExistingTestimonial | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailImageIndex, setDetailImageIndex] = useState(0);
    const [, upsertCustomer] = useMutation(UserBookingRequestOfferTestimonialUpsertDocument);
    const [, upsertCook] = useMutation(CookBookingRequestOfferTestimonialUpsertDocument);

    const form = useForm({
        defaultValues: EMPTY_FORM_VALUES,
        onSubmit: async ({ value }) => {
            const rating = value.rating;
            if (rating == null) return;

            const needsLowRatingAnswers = role === 'cook' && rating < 5;
            try {
                if (role === 'customer') {
                    const result = await upsertCustomer({
                        input: {
                            bookingRequestOfferId,
                            body: value.body.trim(),
                            rating,
                            imageFileUploadIds: value.imageFileUploadIds,
                        },
                    });
                    if (result.error || !result.data?.user.bookingRequestOfferTestimonialUpsert.success) {
                        toast.error(inlineCopy({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }, locale));
                        return;
                    }
                } else {
                    const result = await upsertCook({
                        input: {
                            bookingRequestOfferId,
                            body: value.body.trim() || null,
                            rating,
                            imageFileUploadIds: value.imageFileUploadIds,
                            lowRatingAnswers: needsLowRatingAnswers
                                ? {
                                      whatWentWrong: value.whatWentWrong.trim(),
                                      wouldRecommend: value.wouldRecommend,
                                      additionalFeedback: value.additionalFeedback.trim() || null,
                                  }
                                : null,
                        },
                    });
                    if (result.error || !result.data?.user.cook.bookingRequestOfferTestimonialUpsert.success) {
                        toast.error(inlineCopy({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }, locale));
                        return;
                    }
                }
                setSubmitted({
                    body: value.body.trim(),
                    rating,
                    imageUrls: value.imageFileUploadIds.map(fileUploadPublicUrl),
                    authorName: authorFallback.authorName,
                    authorProfilePictureUrl: authorFallback.authorProfilePictureUrl,
                    location: authorFallback.location,
                    occasion: authorFallback.occasion,
                    publicationStatus: rating <= 3 ? 'PENDING_REVIEW' : 'PUBLISHED',
                });
                setLocalOverride(null);
                onSubmitted?.();
                toast.success(inlineCopy({ de: 'Danke für deine Bewertung!', en: 'Thanks for your review!' }, locale));
            } catch {
                toast.error(inlineCopy({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }, locale));
            }
        },
    });

    const shownBase = localOverride ?? existing ?? submitted;
    const shown = shownBase;

    const hadLowRatingAnswers = shownBase != null && shownBase.rating != null && shownBase.rating < 5;

    const editForm = useForm({
        defaultValues: EMPTY_FORM_VALUES,
        onSubmit: async ({ value }) => {
            const rating = value.rating;
            if (rating == null) return;

            const needsLowRatingAnswers = role === 'cook' && rating < 5 && !hadLowRatingAnswers;
            const includeLowRatingAnswers = role === 'cook' && rating < 5 && value.whatWentWrong.trim().length > 0;
            try {
                if (role === 'customer') {
                    const result = await upsertCustomer({
                        input: {
                            bookingRequestOfferId,
                            body: value.body.trim(),
                            rating,
                            imageFileUploadIds: value.imageFileUploadIds,
                        },
                    });
                    if (result.error || !result.data?.user.bookingRequestOfferTestimonialUpsert.success) {
                        toast.error(inlineCopy({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }, locale));
                        return;
                    }
                } else {
                    if (needsLowRatingAnswers && !includeLowRatingAnswers) {
                        toast.error(inlineCopy({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }, locale));
                        return;
                    }
                    const result = await upsertCook({
                        input: {
                            bookingRequestOfferId,
                            body: value.body.trim() || null,
                            rating,
                            imageFileUploadIds: value.imageFileUploadIds,
                            lowRatingAnswers: includeLowRatingAnswers
                                ? {
                                      whatWentWrong: value.whatWentWrong.trim(),
                                      wouldRecommend: value.wouldRecommend,
                                      additionalFeedback: value.additionalFeedback.trim() || null,
                                  }
                                : null,
                        },
                    });
                    if (result.error || !result.data?.user.cook.bookingRequestOfferTestimonialUpsert.success) {
                        toast.error(inlineCopy({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }, locale));
                        return;
                    }
                }
                setLocalOverride({
                    ...(shownBase ?? {}),
                    body: value.body.trim(),
                    rating,
                    imageUrls: value.imageFileUploadIds.map(fileUploadPublicUrl),
                    authorName: shownBase?.authorName ?? authorFallback.authorName,
                    authorProfilePictureUrl: shownBase?.authorProfilePictureUrl ?? authorFallback.authorProfilePictureUrl,
                    location: shownBase?.location ?? authorFallback.location,
                    occasion: shownBase?.occasion ?? authorFallback.occasion,
                    createdAt: shownBase?.createdAt,
                    publicationStatus: rating <= 3 ? 'PENDING_REVIEW' : 'PUBLISHED',
                });
                onEditingChange?.(false);
                toast.success(inlineCopy({ de: 'Bewertung aktualisiert.', en: 'Review updated.' }, locale));
            } catch {
                toast.error(inlineCopy({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }, locale));
            }
        },
    });

    const submissionAttempts = useSelector(form.store, (state) => state.submissionAttempts);
    const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
    const rating = useSelector(form.store, (state) => state.values.rating);
    const imageFileUploadIds = useSelector(form.store, (state) => state.values.imageFileUploadIds);
    const editSubmissionAttempts = useSelector(editForm.store, (state) => state.submissionAttempts);
    const isEditSubmitting = useSelector(editForm.store, (state) => state.isSubmitting);
    const editRating = useSelector(editForm.store, (state) => state.values.rating);
    const editImageFileUploadIds = useSelector(editForm.store, (state) => state.values.imageFileUploadIds);
    const needsLowRatingAnswers = role === 'cook' && rating != null && rating < 5;
    const editNeedsLowRatingAnswers = role === 'cook' && editRating != null && editRating < 5;
    const editRequiresLowRatingAnswers = editNeedsLowRatingAnswers && !hadLowRatingAnswers;
    const busy = isSubmitting || isEditSubmitting || uploadBusy;

    const reportBusy = useEffectEvent((next: boolean) => {
        onBusyChange?.(next);
    });

    useEffect(() => {
        reportBusy(busy);
        return () => reportBusy(false);
    }, [busy]);

    const syncEditFormFromShown = useEffectEvent(() => {
        if (shown == null) return;
        editForm.reset(
            {
                rating: shown.rating,
                body: shown.body,
                imageFileUploadIds: imageIdsFromUrls(shown.imageUrls),
                whatWentWrong: '',
                wouldRecommend: null,
                additionalFeedback: '',
            },
            { keepDefaultValues: true },
        );
        setUploadError(null);
    });

    useEffect(() => {
        if (!editing) return;
        syncEditFormFromShown();
    }, [editing]);

    async function addFiles(fileList: FileList | null, currentIds: string[], setIds: (ids: string[]) => void) {
        if (fileList == null || fileList.length === 0) return;
        setUploadError(null);

        const images = Array.from(fileList).filter((file) => file.type.startsWith('image/'));
        if (images.length === 0) {
            setUploadError(
                inlineCopy(
                    {
                        de: 'Bitte ein Bild (JPEG, PNG, WebP oder GIF) wählen.',
                        en: 'Please choose an image (JPEG, PNG, WebP, or GIF).',
                    },
                    locale,
                ),
            );
            if (inputRef.current) inputRef.current.value = '';
            return;
        }

        const remaining = MAX_IMAGES - currentIds.length;
        if (remaining <= 0) {
            setUploadError(
                inlineCopy(
                    {
                        de: `Du kannst bis zu ${MAX_IMAGES} Bilder hinzufügen.`,
                        en: `You can add up to ${MAX_IMAGES} photos.`,
                    },
                    locale,
                ),
            );
            if (inputRef.current) inputRef.current.value = '';
            return;
        }

        const capped = images.length > remaining;
        const toUpload = images.slice(0, remaining);
        setUploadBusy(true);
        let nextIds = [...currentIds];
        try {
            for (const file of toUpload) {
                const compressed = await imageCompress(file, IMAGE_COMPRESS_PRESETS.testimonial);
                const uploaded = await uploadFile(compressed);
                nextIds = [...nextIds, uploaded.fileUploadId];
                setIds(nextIds);
            }
            if (capped) {
                setUploadError(
                    inlineCopy(
                        {
                            de: `Du kannst bis zu ${MAX_IMAGES} Bilder hinzufügen.`,
                            en: `You can add up to ${MAX_IMAGES} photos.`,
                        },
                        locale,
                    ),
                );
            }
        } catch (error) {
            setUploadError(uploadErrorMessage(error, locale));
        } finally {
            setUploadBusy(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    }

    function removeImage(fileUploadId: string, currentIds: string[], setIds: (ids: string[]) => void) {
        setIds(currentIds.filter((id) => id !== fileUploadId));
        setUploadError(null);
    }

    function openDetail(index: number) {
        setDetailImageIndex(index);
        setDetailOpen(true);
    }

    function renderImageField(ids: string[], setIds: (ids: string[]) => void) {
        return (
            <div className="grid gap-2">
                <div className="grid gap-0.5">
                    <span className="text-sm font-medium text-foreground">
                        {inlineCopy({ de: 'Teile deine Eindrücke', en: 'Share your impressions' }, locale)}
                    </span>
                    <p className="text-xs text-muted-foreground">
                        {inlineCopy(
                            {
                                de: `Optional. Bis zu ${MAX_IMAGES} Fotos vom Abend.`,
                                en: `Optional. Up to ${MAX_IMAGES} photos from the evening.`,
                            },
                            locale,
                        )}
                    </p>
                </div>
                <ul
                    className="grid grid-cols-4 gap-1.5"
                    aria-label={inlineCopy({ de: 'Fotos der Bewertung', en: 'Review photos' }, locale)}
                >
                    {ids.map((fileUploadId) => {
                        const url = fileUploadPublicUrl(fileUploadId);
                        return (
                            <li key={fileUploadId} className="group relative aspect-square overflow-hidden rounded-md bg-muted">
                                <img src={url} alt="" className="size-full object-cover" />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon-xs"
                                    disabled={busy}
                                    onClick={() => removeImage(fileUploadId, ids, setIds)}
                                    aria-label={inlineCopy({ de: 'Bild entfernen', en: 'Remove image' }, locale)}
                                    className={cn(
                                        'absolute top-1 right-1 rounded-full opacity-0 shadow-sm group-hover:opacity-100',
                                        'pointer-fine:opacity-0 focus-visible:opacity-100',
                                    )}
                                >
                                    <XIcon className="size-3" aria-hidden />
                                </Button>
                            </li>
                        );
                    })}
                    {ids.length < MAX_IMAGES ? (
                        <li>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={busy}
                                onClick={() => inputRef.current?.click()}
                                className="aspect-square size-full min-h-0 min-w-16 border-dashed text-muted-foreground"
                                aria-label={inlineCopy({ de: 'Bilder hinzufügen', en: 'Add photos' }, locale)}
                            >
                                {uploadBusy ? <Spinner className="size-4" /> : <PlusIcon className="size-5" aria-hidden />}
                            </Button>
                        </li>
                    ) : null}
                </ul>
                <input
                    ref={inputRef}
                    type="file"
                    accept={IMAGE_CROP_ACCEPT}
                    multiple
                    className="sr-only"
                    onChange={(event) => void addFiles(event.target.files, ids, setIds)}
                />
                {uploadError != null ? (
                    <p className="text-sm text-destructive" role="alert">
                        {uploadError}
                    </p>
                ) : null}
            </div>
        );
    }

    function renderLowRatingFields(activeForm: typeof form, attempts: number, requireAnswers: boolean) {
        return (
            <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm font-medium text-foreground">
                    {inlineCopy({ de: 'Was können wir besser machen?', en: 'What can we do better?' }, locale)}
                </p>
                {!requireAnswers ? (
                    <p className="text-sm text-muted-foreground">
                        {inlineCopy(
                            {
                                de: 'Optional: aktualisiere dein Feedback, oder lass die Felder leer, um deine bisherigen Antworten zu behalten.',
                                en: 'Optional: update your feedback, or leave the fields blank to keep your previous answers.',
                            },
                            locale,
                        )}
                    </p>
                ) : null}
                <activeForm.Field
                    name="whatWentWrong"
                    validators={{
                        onChange: ({ value }) => (requireAnswers ? requiredWhatWentWrong(value, locale) : undefined),
                        onBlur: ({ value }) => (requireAnswers ? requiredWhatWentWrong(value, locale) : undefined),
                        onSubmit: ({ value }) => (requireAnswers ? requiredWhatWentWrong(value, locale) : undefined),
                    }}
                >
                    {(field) => {
                        const errorMessage = fieldErrorText(field.state.meta.errors);
                        const showError = errorMessage != null && (field.state.meta.isBlurred || attempts > 0);
                        const errorId = `${field.name}-error`;
                        return (
                            <div className="grid gap-2">
                                <label
                                    htmlFor={`${activeForm === form ? 'create' : 'edit'}-what-went-wrong`}
                                    className="text-sm text-muted-foreground"
                                >
                                    {inlineCopy({ de: 'Was ist nicht gut gelaufen?', en: 'What did not go well?' }, locale)}
                                </label>
                                <Textarea
                                    id={`${activeForm === form ? 'create' : 'edit'}-what-went-wrong`}
                                    name={field.name}
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
                </activeForm.Field>
                <activeForm.Field name="wouldRecommend">
                    {(field) => (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                                {inlineCopy({ de: 'Würdest du peopleeat weiterempfehlen?', en: 'Would you recommend peopleeat?' }, locale)}
                            </span>
                            <Button
                                type="button"
                                size="sm"
                                variant={field.state.value === true ? 'default' : 'outline'}
                                onClick={() => field.handleChange(true)}
                            >
                                {inlineCopy({ de: 'Ja', en: 'Yes' }, locale)}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant={field.state.value === false ? 'default' : 'outline'}
                                onClick={() => field.handleChange(false)}
                            >
                                {inlineCopy({ de: 'Nein', en: 'No' }, locale)}
                            </Button>
                        </div>
                    )}
                </activeForm.Field>
                <activeForm.Field name="additionalFeedback">
                    {(field) => (
                        <div className="grid gap-2">
                            <label
                                htmlFor={`${activeForm === form ? 'create' : 'edit'}-additional-feedback`}
                                className="text-sm text-muted-foreground"
                            >
                                {inlineCopy({ de: 'Weiteres Feedback (optional)', en: 'Anything else (optional)' }, locale)}
                            </label>
                            <Textarea
                                id={`${activeForm === form ? 'create' : 'edit'}-additional-feedback`}
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(event) => field.handleChange(event.target.value)}
                                rows={2}
                            />
                        </div>
                    )}
                </activeForm.Field>
            </div>
        );
    }

    if (shown != null && editing) {
        return (
            <form
                id={BOOKING_REQUEST_OFFER_TESTIMONIAL_EDIT_FORM_ID}
                className="grid max-w-xl gap-5"
                noValidate
                onSubmit={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void editForm.handleSubmit();
                }}
            >
                <div className="grid gap-1">
                    <h2 className="text-base font-medium text-foreground">
                        {inlineCopy({ de: 'Bewertung bearbeiten', en: 'Edit review' }, locale)}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {inlineCopy(
                            {
                                de: 'Passe Sterne, Text und Fotos an, wenn sich etwas geändert hat.',
                                en: 'Update stars, text, and photos if something changed.',
                            },
                            locale,
                        )}
                    </p>
                </div>

                <editForm.Field
                    name="rating"
                    validators={{
                        onChange: ({ value }) => requiredRating(value, locale),
                        onBlur: ({ value }) => requiredRating(value, locale),
                        onSubmit: ({ value }) => requiredRating(value, locale),
                    }}
                >
                    {(field) => {
                        const errorMessage = fieldErrorText(field.state.meta.errors);
                        const showError = errorMessage != null && (field.state.meta.isBlurred || editSubmissionAttempts > 0);
                        const errorId = `${field.name}-edit-error`;
                        return (
                            <div className="grid gap-2">
                                <span className="text-sm font-medium text-foreground" id={`${field.name}-edit-label`}>
                                    {inlineCopy({ de: 'Deine Sterne', en: 'Your rating' }, locale)}
                                </span>
                                <div aria-invalid={showError} aria-describedby={showError ? errorId : undefined}>
                                    <TestimonialRatingInput
                                        value={field.state.value}
                                        onChange={(next) => {
                                            field.handleChange(next);
                                            field.handleBlur();
                                        }}
                                        size="lg"
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
                </editForm.Field>

                <editForm.Field
                    name="body"
                    validators={{
                        onChange: ({ value }) => (role === 'customer' ? requiredCustomerBody(value, locale) : undefined),
                        onBlur: ({ value }) => (role === 'customer' ? requiredCustomerBody(value, locale) : undefined),
                        onSubmit: ({ value }) => (role === 'customer' ? requiredCustomerBody(value, locale) : undefined),
                    }}
                >
                    {(field) => {
                        const errorMessage = fieldErrorText(field.state.meta.errors);
                        const showError = errorMessage != null && (field.state.meta.isBlurred || editSubmissionAttempts > 0);
                        const errorId = `${field.name}-edit-error`;
                        return (
                            <div className="grid gap-2">
                                <label htmlFor="testimonial-edit-body" className="text-sm font-medium text-foreground">
                                    {role === 'customer'
                                        ? inlineCopy({ de: 'Dein Text', en: 'Your review' }, locale)
                                        : inlineCopy({ de: 'Dein Kommentar', en: 'Your comment' }, locale)}
                                </label>
                                <Textarea
                                    id="testimonial-edit-body"
                                    name={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                    rows={5}
                                    className="text-base/relaxed"
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
                </editForm.Field>

                <editForm.Field name="imageFileUploadIds">
                    {() => renderImageField(editImageFileUploadIds, (ids) => editForm.setFieldValue('imageFileUploadIds', ids))}
                </editForm.Field>

                {editNeedsLowRatingAnswers ? renderLowRatingFields(editForm, editSubmissionAttempts, editRequiresLowRatingAnswers) : null}
            </form>
        );
    }

    if (shown != null) {
        const card = toCardModel(shown, authorFallback);
        const viewLabel = inlineCopy({ de: 'Bewertung ansehen', en: 'View review' }, locale);
        return (
            <div className="grid max-w-xl gap-5">
                <div className="grid gap-1">
                    <h2 className="text-base font-medium text-foreground">
                        {inlineCopy({ de: 'Danke für deine Stimme', en: 'Thank you for sharing' }, locale)}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {inlineCopy(
                            {
                                de: 'Dein Feedback macht den nächsten Abend noch schöner für andere Gäste.',
                                en: 'Your feedback helps the next guest look forward to their evening too.',
                            },
                            locale,
                        )}
                    </p>
                </div>

                <TestimonialCardFace
                    testimonial={card}
                    onOpenImage={card.imageUrls != null && card.imageUrls.length > 0 ? openDetail : undefined}
                />

                <div className="flex gap-2 flex-wrap *:flex-1">
                    <Button type="button" variant="outline" size="sm" onClick={() => onEditingChange?.(true)}>
                        {inlineCopy({ de: 'Bewertung bearbeiten', en: 'Edit review' }, locale)}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => openDetail(0)}>
                        {viewLabel}
                    </Button>
                </div>

                <TestimonialDetailDialog
                    testimonial={card}
                    open={detailOpen}
                    onOpenChange={setDetailOpen}
                    initialImageIndex={detailImageIndex}
                    showBookingCta={false}
                />

                {shown.publicationStatus === 'PENDING_REVIEW' ? (
                    <p className="text-sm text-muted-foreground">
                        {inlineCopy(
                            {
                                de: 'Wir schauen uns deine Bewertung noch kurz an, bevor sie sichtbar wird.',
                                en: 'We are reviewing your feedback briefly before it goes live.',
                            },
                            locale,
                        )}
                    </p>
                ) : null}

                {role === 'customer' && shown.body ? (
                    <div className="grid gap-3 border-t border-border pt-4">
                        <div className="grid gap-1">
                            <p className="text-sm font-medium text-foreground">
                                {inlineCopy(
                                    {
                                        de: 'Magst du uns auch bei Google empfehlen?',
                                        en: 'Want to recommend us on Google too?',
                                    },
                                    locale,
                                )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {inlineCopy(
                                    {
                                        de: 'Kopiere deinen Text und füge ihn bei Google ein. Das hilft uns enorm.',
                                        en: 'Copy your text and paste it into Google. It means a lot to us.',
                                    },
                                    locale,
                                )}
                            </p>
                        </div>
                        <div className="flex gap-2 flex-wrap *:flex-1">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    void navigator.clipboard.writeText(shown.body);
                                    toast.success(inlineCopy({ de: 'Text kopiert.', en: 'Text copied.' }, locale));
                                }}
                            >
                                {inlineCopy({ de: 'Text kopieren', en: 'Copy text' }, locale)}
                            </Button>
                            <Button asChild size="sm">
                                <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noreferrer">
                                    {inlineCopy({ de: 'Google öffnen', en: 'Open Google' }, locale)}
                                </a>
                            </Button>
                        </div>
                    </div>
                ) : null}
            </div>
        );
    }

    if (!missing) {
        return null;
    }

    const counterpartName = counterpart.displayName.trim();
    const requiredHint = inlineCopy({ de: 'erforderlich', en: 'required' }, locale);
    const optionalHint = inlineCopy({ de: 'optional', en: 'optional' }, locale);

    return (
        <form
            id={BOOKING_REQUEST_OFFER_TESTIMONIAL_FORM_ID}
            className="grid max-w-xl gap-4 rounded-xl border border-border bg-card p-5"
            noValidate
            onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void form.handleSubmit();
            }}
        >
            <div className="grid gap-3">
                {counterpartName.length > 0 ? (
                    <div className="flex items-center gap-2.5">
                        <Avatar className="size-8 shrink-0">
                            {counterpart.profilePictureUrl ? <AvatarImage src={counterpart.profilePictureUrl} alt="" /> : null}
                            <AvatarFallback className="text-[10px]">{initialsFromName(counterpartName)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <p className="truncate text-sm text-muted-foreground">
                                {inlineCopy({ de: 'Bewertung für', en: 'Review for' }, locale)}
                            </p>
                            <p className="truncate text-sm font-medium text-foreground">{counterpartName}</p>
                        </div>
                    </div>
                ) : null}
                <h2 className="text-base font-medium text-foreground">
                    {role === 'customer'
                        ? inlineCopy({ de: 'Wie war dein Event?', en: 'How was your event?' }, locale)
                        : inlineCopy({ de: 'Wie war der Abend?', en: 'How was the evening?' }, locale)}
                </h2>
            </div>

            <form.Field
                name="rating"
                validators={{
                    onChange: ({ value }) => requiredRating(value, locale),
                    onBlur: ({ value }) => requiredRating(value, locale),
                    onSubmit: ({ value }) => requiredRating(value, locale),
                }}
            >
                {(field) => {
                    const errorMessage = fieldErrorText(field.state.meta.errors);
                    const showError = errorMessage != null && (field.state.meta.isBlurred || submissionAttempts > 0);
                    const errorId = `${field.name}-error`;
                    return (
                        <div className="grid gap-2">
                            <span className="text-sm font-medium text-foreground" id={`${field.name}-label`}>
                                {inlineCopy({ de: 'Vergib deine Sterne', en: 'Give your stars' }, locale)}
                                <span className="font-normal text-muted-foreground"> ({requiredHint})</span>
                            </span>
                            <div aria-invalid={showError} aria-describedby={showError ? errorId : undefined}>
                                <TestimonialRatingInput
                                    value={field.state.value}
                                    onChange={(next) => {
                                        field.handleChange(next);
                                        field.handleBlur();
                                    }}
                                    size="md"
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

            <form.Field
                name="body"
                validators={{
                    onChange: ({ value }) => (role === 'customer' ? requiredCustomerBody(value, locale) : undefined),
                    onBlur: ({ value }) => (role === 'customer' ? requiredCustomerBody(value, locale) : undefined),
                    onSubmit: ({ value }) => (role === 'customer' ? requiredCustomerBody(value, locale) : undefined),
                }}
            >
                {(field) => {
                    const errorMessage = fieldErrorText(field.state.meta.errors);
                    const showError = errorMessage != null && (field.state.meta.isBlurred || submissionAttempts > 0);
                    const errorId = `${field.name}-error`;
                    return (
                        <div className="grid gap-2">
                            <label htmlFor="testimonial-body" className="text-sm font-medium text-foreground">
                                {role === 'customer'
                                    ? inlineCopy({ de: 'Erzähl von dem Abend', en: 'Tell us about the evening' }, locale)
                                    : inlineCopy({ de: 'Teile dein Feedback', en: 'Share your feedback' }, locale)}
                                <span className="font-normal text-muted-foreground">
                                    {' '}
                                    ({role === 'customer' ? requiredHint : optionalHint})
                                </span>
                            </label>
                            <Textarea
                                id="testimonial-body"
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(event) => field.handleChange(event.target.value)}
                                rows={4}
                                className="text-base/relaxed"
                                aria-invalid={showError}
                                aria-describedby={showError ? errorId : undefined}
                                placeholder={
                                    role === 'customer'
                                        ? inlineCopy(
                                              {
                                                  de: 'Essen, Atmosphäre, Service…',
                                                  en: 'Food, atmosphere, service…',
                                              },
                                              locale,
                                          )
                                        : inlineCopy(
                                              {
                                                  de: 'Was soll der nächste Koch wissen?',
                                                  en: 'What should the next cook know?',
                                              },
                                              locale,
                                          )
                                }
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

            <form.Field name="imageFileUploadIds">
                {() => renderImageField(imageFileUploadIds, (ids) => form.setFieldValue('imageFileUploadIds', ids))}
            </form.Field>

            {needsLowRatingAnswers ? renderLowRatingFields(form, submissionAttempts, true) : null}
        </form>
    );
}
