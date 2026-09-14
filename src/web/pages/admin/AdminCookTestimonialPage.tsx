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
    AlertDialogTrigger,
} from '../../components/base/alert-dialog';
import { Badge } from '../../components/base/badge';
import { Button } from '../../components/base/button';
import { Input } from '../../components/base/input';
import { Separator } from '../../components/base/separator';
import { StatusAlert } from '../../components/base/status-alert';
import { Textarea } from '../../components/base/textarea';
import { TestimonialRatingInput } from '../../components/TestimonialRatingInput';
import { TestimonialRatingStars } from '../../components/TestimonialRatingStars';
import type { GqlCAdminCookTestimonialPageQuery } from '../../graphql/generated';
import {
    AdminCookTestimonialDetailDeleteDocument,
    AdminCookTestimonialDetailImageUpdateDocument,
    AdminCookTestimonialDetailPublishDocument,
    AdminCookTestimonialDetailUpdateDocument,
    AdminCookTestimonialPageUpdatesDocument,
} from '../../graphql/generated';
import { useLocale } from '../../hooks/useLocale';
import { useTimeZone } from '../../hooks/useTimeZone';
import { adminStubRouteBySlug } from './adminCatalog';
import { AdminTestimonialImageManager } from './AdminTestimonialImageManager';
import { testimonialPublicationStatusLabel } from './adminTestimonialsShared';

const listRoute = adminStubRouteBySlug('testimonials');

export const adminCookTestimonialPageTitle = { de: 'Koch-Bewertung', en: 'Cook testimonial' } as const;
export const adminCookTestimonialPageDescription = {
    de: 'Koch-Bewertung bearbeiten, veröffentlichen oder löschen.',
    en: 'Edit, publish, or delete a cook testimonial.',
} as const;

type AdminCookTestimonialDetail = NonNullable<
    NonNullable<NonNullable<GqlCAdminCookTestimonialPageQuery['currentSession']['user']>['admin']>['cookTestimonial']
>;

type FormValues = {
    authorName: string;
    location: string;
    occasion: string;
    body: string;
    rating: number | null;
};

function formFromTestimonial(testimonial: AdminCookTestimonialDetail): FormValues {
    return {
        authorName: testimonial.authorName ?? '',
        location: testimonial.location ?? '',
        occasion: testimonial.occasion ?? '',
        body: testimonial.body ?? '',
        rating: testimonial.rating ?? null,
    };
}

export function AdminCookTestimonialPage({
    data,
    cookTestimonialId,
}: {
    data: GqlCAdminCookTestimonialPageQuery;
    cookTestimonialId: string;
}) {
    const locale = useLocale();
    const timeZone = useTimeZone();
    const navigate = useNavigate();
    const client = useClient();
    const seed = data.currentSession.user?.admin?.cookTestimonial ?? null;
    const [testimonial, setTestimonial] = useState(seed);
    const [, updateTestimonial] = useMutation(AdminCookTestimonialDetailUpdateDocument);
    const [, deleteTestimonial] = useMutation(AdminCookTestimonialDetailDeleteDocument);
    const [, publishTestimonial] = useMutation(AdminCookTestimonialDetailPublishDocument);
    const [, updateImages] = useMutation(AdminCookTestimonialDetailImageUpdateDocument);
    const [publishBusy, setPublishBusy] = useState(false);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const form = useForm({
        defaultValues: testimonial
            ? formFromTestimonial(testimonial)
            : { authorName: '', location: '', occasion: '', body: '', rating: null },
        onSubmit: async ({ value }) => {
            const result = await updateTestimonial({
                cookTestimonialId,
                input: {
                    authorName: value.authorName.trim() || null,
                    location: value.location.trim() || null,
                    occasion: value.occasion.trim() || null,
                    body: value.body.trim() || null,
                    rating: value.rating,
                },
            });
            if (result.error || !result.data?.admin.cookTestimonialUpdate.success) {
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
        const request = createRequest(AdminCookTestimonialPageUpdatesDocument, { cookTestimonialId });
        const { unsubscribe } = pipe(
            client.executeSubscription(request),
            subscribe((result) => {
                const next = result.data?.adminUpdates.cookTestimonial;
                if (next) {
                    setTestimonial(next);
                    form.reset(formFromTestimonial(next));
                }
            }),
        );
        return unsubscribe;
    }, [client, cookTestimonialId, seed]);

    async function onTogglePublish() {
        if (!testimonial || publishBusy) return;
        setPublishBusy(true);
        try {
            const next = testimonial.publicationStatus === 'PUBLISHED' ? 'PENDING_REVIEW' : 'PUBLISHED';
            const result = await publishTestimonial({ cookTestimonialId, publicationStatus: next });
            if (result.error || !result.data?.admin.cookTestimonialPublish.success) {
                throw new Error('publish failed');
            }
        } catch {
            toast.error({ de: 'Status konnte nicht geändert werden.', en: 'Could not update the status.' }[locale]);
        } finally {
            setPublishBusy(false);
        }
    }

    async function onDelete() {
        setDeleteBusy(true);
        try {
            const result = await deleteTestimonial({ cookTestimonialId });
            if (result.error || !result.data?.admin.cookTestimonialDelete.success) {
                throw new Error('delete failed');
            }
            await navigate({ to: listRoute.to });
        } catch {
            toast.error({ de: 'Löschen fehlgeschlagen.', en: 'Could not delete the testimonial.' }[locale]);
            setDeleteBusy(false);
        }
    }

    async function onSaveImages(fileUploadIds: string[]): Promise<boolean> {
        const result = await updateImages({ cookTestimonialId, imageFileUploadIds: fileUploadIds });
        return Boolean(result.data?.admin.cookTestimonialImageUpdate.success) && !result.error;
    }

    const crumbLabel = testimonial?.displayAuthorName || adminCookTestimonialPageTitle[locale];

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
                                <Button type="button" variant="outline" disabled={publishBusy} onClick={() => void onTogglePublish()}>
                                    {testimonial.publicationStatus === 'PUBLISHED'
                                        ? { de: 'Zurückstellen', en: 'Unpublish' }[locale]
                                        : { de: 'Veröffentlichen', en: 'Publish' }[locale]}
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button type="button" variant="destructive" disabled={deleteBusy}>
                                            {{ de: 'Löschen', en: 'Delete' }[locale]}
                                        </Button>
                                    </AlertDialogTrigger>
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
                                            <AlertDialogCancel>{{ de: 'Abbrechen', en: 'Cancel' }[locale]}</AlertDialogCancel>
                                            <AlertDialogAction variant="destructive" onClick={() => void onDelete()}>
                                                {{ de: 'Löschen', en: 'Delete' }[locale]}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <h2 className="text-sm font-medium text-foreground">{{ de: 'Herkunft', en: 'Source' }[locale]}</h2>
                            <div className="flex flex-wrap items-center gap-3 text-sm">
                                <Link
                                    to="/{-$locale}/admin/users/$userId"
                                    params={{ userId: testimonial.cook.user.userId }}
                                    className="text-foreground hover:underline"
                                >
                                    {userDisplayName(testimonial.cook.user)} ({testimonial.cook.user.emailAddress})
                                </Link>
                                {testimonial.bookingRequestOfferId ? (
                                    <AdminTestimonialOfferLink bookingRequestOfferId={testimonial.bookingRequestOfferId} />
                                ) : (
                                    <span className="text-muted-foreground">{{ de: 'Nicht verknüpft', en: 'Not linked' }[locale]}</span>
                                )}
                            </div>
                        </div>

                        {testimonial.lowRatingAnswers ? (
                            <StatusAlert tone="warning" title={{ de: 'Niedrige Bewertung', en: 'Low rating' }[locale]}>
                                <div className="grid gap-2 text-sm">
                                    {testimonial.lowRatingAnswers.whatWentWrong ? (
                                        <p>
                                            <span className="font-medium">
                                                {{ de: 'Was lief schief: ', en: 'What went wrong: ' }[locale]}
                                            </span>
                                            {testimonial.lowRatingAnswers.whatWentWrong}
                                        </p>
                                    ) : null}
                                    {testimonial.lowRatingAnswers.wouldRecommend != null ? (
                                        <p>
                                            <span className="font-medium">
                                                {{ de: 'Würde weiterempfehlen: ', en: 'Would recommend: ' }[locale]}
                                            </span>
                                            {testimonial.lowRatingAnswers.wouldRecommend
                                                ? { de: 'Ja', en: 'Yes' }[locale]
                                                : { de: 'Nein', en: 'No' }[locale]}
                                        </p>
                                    ) : null}
                                    {testimonial.lowRatingAnswers.additionalFeedback ? (
                                        <p>
                                            <span className="font-medium">
                                                {{ de: 'Weiteres Feedback: ', en: 'Additional feedback: ' }[locale]}
                                            </span>
                                            {testimonial.lowRatingAnswers.additionalFeedback}
                                        </p>
                                    ) : null}
                                </div>
                            </StatusAlert>
                        ) : null}

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
