import { useForm, useSelector } from '@tanstack/react-form';
import { PlusIcon, XIcon } from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { fileUploadPublicUrl } from '../../shared';
import { uploadErrorMessage, uploadFile } from '../chat/fileUpload';
import {
    CookBookingRequestOfferTestimonialCreateDocument,
    CookBookingRequestOfferTestimonialUpdateDocument,
    UserBookingRequestOfferTestimonialCreateDocument,
    UserBookingRequestOfferTestimonialUpdateDocument,
} from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { cn } from '../utils/cn';
import type { Locale } from '../utils/locale';
import { Button } from './base/button';
import { Spinner } from './base/spinner';
import { Textarea } from './base/textarea';
import type { PageTestimonialCardModel } from './PageTestimonialCard';
import { PageTestimonialCardFace, PageTestimonialDetailDialog } from './PageTestimonialCard';
import { TestimonialRatingInput } from './TestimonialRatingInput';

export const BOOKING_REQUEST_OFFER_TESTIMONIAL_FORM_ID = 'booking-request-offer-testimonial-form';
export const BOOKING_REQUEST_OFFER_TESTIMONIAL_EDIT_FORM_ID = 'booking-request-offer-testimonial-edit-form';

const GOOGLE_REVIEW_URL = 'https://g.page/r/CTt2r08ker0wEAE/review';
const MAX_IMAGES = 8;

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

type FormValues = {
    rating: number | null;
    body: string;
    imageFileUploadIds: string[];
    whatWentWrong: string;
    wouldRecommend: boolean | null;
    additionalFeedback: string;
};

type EditFormValues = {
    body: string;
};

function fieldErrorText(errors: unknown[]): string | undefined {
    const first = errors[0];
    return typeof first === 'string' && first.length > 0 ? first : undefined;
}

function requiredRating(value: number | null, locale: Locale): string | undefined {
    if (value == null || value < 1 || value > 5) {
        return { de: 'Bitte wähle deine Sterne.', en: 'Please choose your star rating.' }[locale];
    }
    return undefined;
}

function requiredCustomerBody(value: string, locale: Locale): string | undefined {
    if (value.trim().length === 0) {
        return {
            de: 'Erzähl kurz, wie der Abend für dich war.',
            en: 'Share a few words about how the evening felt.',
        }[locale];
    }
    return undefined;
}

function requiredWhatWentWrong(value: string, locale: Locale): string | undefined {
    if (value.trim().length === 0) {
        return {
            de: 'Bitte beschreibe kurz, was nicht gut lief.',
            en: 'Please briefly describe what did not go well.',
        }[locale];
    }
    return undefined;
}

function toCardModel(shown: ExistingTestimonial, authorFallback: AuthorFallback): PageTestimonialCardModel {
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
 * Primary submit / edit Save live in the parent pinned footer via the exported
 * form ids.
 */
export function BookingRequestOfferTestimonialPanel({
    bookingRequestOfferId,
    role,
    existing,
    missing,
    authorFallback,
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
    const [localBody, setLocalBody] = useState<string | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailImageIndex, setDetailImageIndex] = useState(0);
    const [, createCustomer] = useMutation(UserBookingRequestOfferTestimonialCreateDocument);
    const [, createCook] = useMutation(CookBookingRequestOfferTestimonialCreateDocument);
    const [, updateCustomer] = useMutation(UserBookingRequestOfferTestimonialUpdateDocument);
    const [, updateCook] = useMutation(CookBookingRequestOfferTestimonialUpdateDocument);

    const defaultValues: FormValues = {
        rating: null,
        body: '',
        imageFileUploadIds: [],
        whatWentWrong: '',
        wouldRecommend: null,
        additionalFeedback: '',
    };

    const form = useForm({
        defaultValues,
        onSubmit: async ({ value }) => {
            const rating = value.rating;
            if (rating == null) return;

            const needsLowRatingAnswers = role === 'cook' && rating < 5;
            try {
                if (role === 'customer') {
                    const result = await createCustomer({
                        input: {
                            bookingRequestOfferId,
                            body: value.body.trim(),
                            rating,
                            imageFileUploadIds: value.imageFileUploadIds,
                        },
                    });
                    if (result.error || !result.data?.user.bookingRequestOfferTestimonialCreate.success) {
                        toast.error({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }[locale]);
                        return;
                    }
                } else {
                    const result = await createCook({
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
                    if (result.error || !result.data?.user.cook.bookingRequestOfferTestimonialCreate.success) {
                        toast.error({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }[locale]);
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
                onSubmitted?.();
                toast.success({ de: 'Danke für deine Bewertung!', en: 'Thanks for your review!' }[locale]);
            } catch {
                toast.error({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }[locale]);
            }
        },
    });

    const shownBase = existing ?? submitted;
    const shown = shownBase == null ? null : localBody != null ? { ...shownBase, body: localBody } : shownBase;

    const editDefaultValues: EditFormValues = { body: shown?.body ?? '' };
    const editForm = useForm({
        defaultValues: editDefaultValues,
        onSubmit: async ({ value }) => {
            try {
                if (role === 'customer') {
                    const result = await updateCustomer({
                        input: { bookingRequestOfferId, body: value.body.trim() },
                    });
                    if (result.error || !result.data?.user.bookingRequestOfferTestimonialUpdate.success) {
                        toast.error({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }[locale]);
                        return;
                    }
                } else {
                    const result = await updateCook({
                        input: { bookingRequestOfferId, body: value.body.trim() || null },
                    });
                    if (result.error || !result.data?.user.cook.bookingRequestOfferTestimonialUpdate.success) {
                        toast.error({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }[locale]);
                        return;
                    }
                }
                setLocalBody(value.body.trim());
                onEditingChange?.(false);
                toast.success({ de: 'Text aktualisiert.', en: 'Text updated.' }[locale]);
            } catch {
                toast.error({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }[locale]);
            }
        },
    });

    const submissionAttempts = useSelector(form.store, (state) => state.submissionAttempts);
    const isSubmitting = useSelector(form.store, (state) => state.isSubmitting);
    const rating = useSelector(form.store, (state) => state.values.rating);
    const imageFileUploadIds = useSelector(form.store, (state) => state.values.imageFileUploadIds);
    const editSubmissionAttempts = useSelector(editForm.store, (state) => state.submissionAttempts);
    const isEditSubmitting = useSelector(editForm.store, (state) => state.isSubmitting);
    const needsLowRatingAnswers = role === 'cook' && rating != null && rating < 5;
    const busy = isSubmitting || isEditSubmitting || uploadBusy;

    const reportBusy = useEffectEvent((next: boolean) => {
        onBusyChange?.(next);
    });

    useEffect(() => {
        reportBusy(busy);
        return () => reportBusy(false);
    }, [busy, reportBusy]);

    const syncEditForm = useEffectEvent((body: string) => {
        editForm.reset({ body });
    });

    const shownBody = shown?.body;
    useEffect(() => {
        if (!editing || shownBody == null) return;
        syncEditForm(shownBody);
    }, [editing, shownBody, syncEditForm]);

    async function addFile(file: File | undefined) {
        if (!file) return;
        setUploadError(null);
        if (!file.type.startsWith('image/')) {
            setUploadError(
                {
                    de: 'Bitte ein Bild (JPEG, PNG, WebP oder GIF) wählen.',
                    en: 'Please choose an image (JPEG, PNG, WebP, or GIF).',
                }[locale],
            );
            if (inputRef.current) inputRef.current.value = '';
            return;
        }
        if (imageFileUploadIds.length >= MAX_IMAGES) {
            setUploadError(
                {
                    de: `Du kannst bis zu ${MAX_IMAGES} Bilder hinzufügen.`,
                    en: `You can add up to ${MAX_IMAGES} photos.`,
                }[locale],
            );
            if (inputRef.current) inputRef.current.value = '';
            return;
        }
        setUploadBusy(true);
        try {
            const uploaded = await uploadFile(file);
            form.setFieldValue('imageFileUploadIds', [...imageFileUploadIds, uploaded.fileUploadId]);
        } catch (error) {
            setUploadError(uploadErrorMessage(error, locale));
        } finally {
            setUploadBusy(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    }

    function removeImage(fileUploadId: string) {
        form.setFieldValue(
            'imageFileUploadIds',
            imageFileUploadIds.filter((id) => id !== fileUploadId),
        );
        setUploadError(null);
    }

    function openDetail(index: number) {
        setDetailImageIndex(index);
        setDetailOpen(true);
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
                    <h2 className="text-base font-medium text-foreground">{{ de: 'Text bearbeiten', en: 'Edit text' }[locale]}</h2>
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: 'Korrigiere Tippfehler oder formuliere den Moment noch klarer.',
                                en: 'Fix typos or sharpen how you describe the moment.',
                            }[locale]
                        }
                    </p>
                </div>
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
                                        ? { de: 'Dein Text', en: 'Your review' }[locale]
                                        : { de: 'Dein Kommentar', en: 'Your comment' }[locale]}
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
            </form>
        );
    }

    if (shown != null) {
        const card = toCardModel(shown, authorFallback);
        const viewLabel = { de: 'Bewertung ansehen', en: 'View review' }[locale];
        return (
            <div className="grid max-w-xl gap-5">
                <div className="grid gap-1">
                    <h2 className="text-base font-medium text-foreground">
                        {{ de: 'Danke für deine Stimme', en: 'Thank you for sharing' }[locale]}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: 'Dein Feedback macht den nächsten Abend noch schöner für andere Gäste.',
                                en: 'Your feedback helps the next guest look forward to their evening too.',
                            }[locale]
                        }
                    </p>
                </div>

                <PageTestimonialCardFace
                    testimonial={card}
                    onOpenImage={card.imageUrls != null && card.imageUrls.length > 0 ? openDetail : undefined}
                    footerAction={
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => onEditingChange?.(true)}>
                                {{ de: 'Text bearbeiten', en: 'Edit text' }[locale]}
                            </Button>
                            <Button type="button" variant="link" size="sm" className="h-auto px-0" onClick={() => openDetail(0)}>
                                {viewLabel}
                            </Button>
                        </div>
                    }
                />
                <PageTestimonialDetailDialog
                    testimonial={card}
                    open={detailOpen}
                    onOpenChange={setDetailOpen}
                    initialImageIndex={detailImageIndex}
                    showBookingCta={false}
                />

                {shown.publicationStatus === 'PENDING_REVIEW' ? (
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: 'Wir schauen uns deine Bewertung noch kurz an, bevor sie sichtbar wird.',
                                en: 'We are reviewing your feedback briefly before it goes live.',
                            }[locale]
                        }
                    </p>
                ) : null}

                {role === 'customer' && shown.body ? (
                    <div className="grid gap-3 border-t border-border pt-4">
                        <div className="grid gap-1">
                            <p className="text-sm font-medium text-foreground">
                                {
                                    {
                                        de: 'Magst du uns auch bei Google empfehlen?',
                                        en: 'Want to recommend us on Google too?',
                                    }[locale]
                                }
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {
                                    {
                                        de: 'Kopiere deinen Text und füge ihn bei Google ein. Das hilft uns enorm.',
                                        en: 'Copy your text and paste it into Google. It means a lot to us.',
                                    }[locale]
                                }
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    void navigator.clipboard.writeText(shown.body);
                                    toast.success({ de: 'Text kopiert.', en: 'Text copied.' }[locale]);
                                }}
                            >
                                {{ de: 'Text kopieren', en: 'Copy text' }[locale]}
                            </Button>
                            <Button asChild size="sm">
                                <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noreferrer">
                                    {{ de: 'Google öffnen', en: 'Open Google' }[locale]}
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

    return (
        <form
            id={BOOKING_REQUEST_OFFER_TESTIMONIAL_FORM_ID}
            className="grid max-w-xl gap-5"
            noValidate
            onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void form.handleSubmit();
            }}
        >
            <div className="grid gap-1">
                <h2 className="text-base font-medium text-foreground">
                    {role === 'customer'
                        ? { de: 'Wie hat dir dein Event geschmeckt?', en: 'How did your evening taste?' }[locale]
                        : { de: 'Wie war der Abend mit deinen Gästen?', en: 'How was the evening with your guests?' }[locale]}
                </h2>
                <p className="text-sm text-muted-foreground">
                    {role === 'customer'
                        ? {
                              de: 'Teile den Moment, der hängen geblieben ist. Deine Worte helfen dem nächsten Gast, sich zu freuen.',
                              en: 'Share the moment that stayed with you. Your words help the next guest look forward to theirs.',
                          }[locale]
                        : {
                              de: 'Ein paar ehrliche Worte zur Zusammenarbeit helfen uns, peopleeat für dich und deine Gäste besser zu machen.',
                              en: 'A few honest words about the collaboration help us make peopleeat better for you and your guests.',
                          }[locale]}
                </p>
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
                                {{ de: 'Deine Sterne', en: 'Your rating' }[locale]}
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
                                    ? { de: 'Erzähl von dem Moment', en: 'Tell us about the moment' }[locale]
                                    : { de: 'Dein Kommentar (optional)', en: 'Your comment (optional)' }[locale]}
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
                                        ? {
                                              de: 'Was hat dich am meisten berührt? Das Essen, die Atmosphäre, ein Lächeln…',
                                              en: 'What moved you most? The food, the atmosphere, a smile…',
                                          }[locale]
                                        : {
                                              de: 'Was solltest du dem nächsten Koch mitgeben?',
                                              en: 'What would you want the next cook to know?',
                                          }[locale]
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
                {(field) => (
                    <div className="grid gap-2">
                        <div className="grid gap-1">
                            <span className="text-sm font-medium text-foreground">
                                {{ de: 'Bilder vom Abend hinzufügen', en: 'Add photos from the evening' }[locale]}
                            </span>
                            <p className="text-sm text-muted-foreground">
                                {
                                    {
                                        de: 'Optional, aber ein Foto sagt oft mehr als Worte.',
                                        en: 'Optional, but a photo often says more than words.',
                                    }[locale]
                                }
                            </p>
                        </div>
                        <ul className="grid grid-cols-4 gap-1.5" aria-label={{ de: 'Fotos der Bewertung', en: 'Review photos' }[locale]}>
                            {field.state.value.map((fileUploadId) => {
                                const url = fileUploadPublicUrl(fileUploadId);
                                return (
                                    <li key={fileUploadId} className="group relative aspect-square overflow-hidden rounded-md bg-muted">
                                        <img src={url} alt="" className="size-full object-cover" />
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="icon-xs"
                                            disabled={busy}
                                            onClick={() => removeImage(fileUploadId)}
                                            aria-label={{ de: 'Bild entfernen', en: 'Remove image' }[locale]}
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
                            {field.state.value.length < MAX_IMAGES ? (
                                <li>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={busy}
                                        onClick={() => inputRef.current?.click()}
                                        className="aspect-square size-full min-h-0 border-dashed text-muted-foreground"
                                        aria-label={{ de: 'Bild hinzufügen', en: 'Add image' }[locale]}
                                    >
                                        {uploadBusy ? <Spinner className="size-4" /> : <PlusIcon className="size-4" aria-hidden />}
                                    </Button>
                                </li>
                            ) : null}
                        </ul>
                        <input
                            ref={inputRef}
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(event) => void addFile(event.target.files?.[0])}
                        />
                        {uploadError != null ? (
                            <p className="text-sm text-destructive" role="alert">
                                {uploadError}
                            </p>
                        ) : null}
                    </div>
                )}
            </form.Field>

            {needsLowRatingAnswers ? (
                <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-4">
                    <p className="text-sm font-medium text-foreground">
                        {{ de: 'Was können wir besser machen?', en: 'What can we do better?' }[locale]}
                    </p>
                    <form.Field
                        name="whatWentWrong"
                        validators={{
                            onChange: ({ value }) => requiredWhatWentWrong(value, locale),
                            onBlur: ({ value }) => requiredWhatWentWrong(value, locale),
                            onSubmit: ({ value }) => requiredWhatWentWrong(value, locale),
                        }}
                    >
                        {(field) => {
                            const errorMessage = fieldErrorText(field.state.meta.errors);
                            const showError = errorMessage != null && (field.state.meta.isBlurred || submissionAttempts > 0);
                            const errorId = `${field.name}-error`;
                            return (
                                <div className="grid gap-2">
                                    <label htmlFor="what-went-wrong" className="text-sm text-muted-foreground">
                                        {{ de: 'Was ist nicht gut gelaufen?', en: 'What did not go well?' }[locale]}
                                    </label>
                                    <Textarea
                                        id="what-went-wrong"
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
                    </form.Field>
                    <form.Field name="wouldRecommend">
                        {(field) => (
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                    {{ de: 'Würdest du peopleeat weiterempfehlen?', en: 'Would you recommend peopleeat?' }[locale]}
                                </span>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={field.state.value === true ? 'default' : 'outline'}
                                    onClick={() => field.handleChange(true)}
                                >
                                    {{ de: 'Ja', en: 'Yes' }[locale]}
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={field.state.value === false ? 'default' : 'outline'}
                                    onClick={() => field.handleChange(false)}
                                >
                                    {{ de: 'Nein', en: 'No' }[locale]}
                                </Button>
                            </div>
                        )}
                    </form.Field>
                    <form.Field name="additionalFeedback">
                        {(field) => (
                            <div className="grid gap-2">
                                <label htmlFor="additional-feedback" className="text-sm text-muted-foreground">
                                    {{ de: 'Weiteres Feedback (optional)', en: 'Anything else (optional)' }[locale]}
                                </label>
                                <Textarea
                                    id="additional-feedback"
                                    name={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                    rows={2}
                                />
                            </div>
                        )}
                    </form.Field>
                </div>
            ) : null}
        </form>
    );
}
