import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation } from 'urql';

import { CookBookingRequestOfferTestimonialCreateDocument, UserBookingRequestOfferTestimonialCreateDocument } from '../graphql/generated';
import { useLocale } from '../hooks/useLocale';
import { Button } from './base/button';
import { Textarea } from './base/textarea';
import { TestimonialRatingInput } from './TestimonialRatingInput';
import { TestimonialRatingStars } from './TestimonialRatingStars';

const GOOGLE_REVIEW_URL = 'https://g.page/r/CTt2r08ker0wEAE/review';

type ExistingTestimonial = {
    body: string;
    rating: number | null;
    publicationStatus?: 'PUBLISHED' | 'PENDING_REVIEW';
};

/**
 * Rating + body submission for a completed booking request offer, shared by
 * the customer offer page and the cook offer detail page. When `role` is
 * `'cook'` and the chosen rating is below 5, a short structured follow-up
 * (`lowRatingAnswers`) is required — see `cookBookingRequestOfferTestimonialCreate`.
 */
export function BookingRequestOfferTestimonialPanel({
    bookingRequestOfferId,
    role,
    existing,
    missing,
}: {
    bookingRequestOfferId: string;
    role: 'customer' | 'cook';
    existing: ExistingTestimonial | null;
    missing: boolean;
}) {
    const locale = useLocale();
    const [rating, setRating] = useState<number | null>(null);
    const [body, setBody] = useState('');
    const [whatWentWrong, setWhatWentWrong] = useState('');
    const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
    const [additionalFeedback, setAdditionalFeedback] = useState('');
    const [submittedBody, setSubmittedBody] = useState<string | null>(null);
    const [, createCustomer] = useMutation(UserBookingRequestOfferTestimonialCreateDocument);
    const [, createCook] = useMutation(CookBookingRequestOfferTestimonialCreateDocument);
    const [busy, setBusy] = useState(false);

    const needsLowRatingAnswers = role === 'cook' && rating != null && rating < 5;
    const shown = existing ?? (submittedBody != null ? { body: submittedBody, rating, publicationStatus: 'PUBLISHED' as const } : null);

    if (shown) {
        return (
            <div className="grid max-w-xl gap-4">
                <div className="grid gap-1">
                    <h2 className="text-base font-medium text-foreground">{{ de: 'Deine Bewertung', en: 'Your review' }[locale]}</h2>
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: 'Danke! Deine Rückmeldung hilft uns und den Gästen.',
                                en: 'Thanks! Your feedback helps us and future guests.',
                            }[locale]
                        }
                    </p>
                </div>
                <TestimonialRatingStars rating={shown.rating} className="gap-1 [&_svg]:size-5" />
                {shown.body ? <p className="text-sm whitespace-pre-wrap text-foreground">{shown.body}</p> : null}
                {shown.publicationStatus === 'PENDING_REVIEW' ? (
                    <p className="text-sm text-muted-foreground">
                        {
                            {
                                de: 'Deine Bewertung wird noch geprüft.',
                                en: 'Your review is pending moderation.',
                            }[locale]
                        }
                    </p>
                ) : null}
                {role === 'customer' && shown.body ? (
                    <div className="grid gap-3 border-t border-border pt-4">
                        <div className="grid gap-1">
                            <p className="text-sm font-medium text-foreground">
                                {{ de: 'Hilf uns auch mit einer Google-Bewertung', en: 'Help us with a Google review too' }[locale]}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {
                                    {
                                        de: 'Kopiere deinen Text und füge ihn bei Google ein.',
                                        en: 'Copy your text and paste it into Google.',
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

    async function submit() {
        if (rating == null || rating < 1 || rating > 5) {
            toast.error({ de: 'Bitte Sterne wählen.', en: 'Please choose a star rating.' }[locale]);
            return;
        }
        if (role === 'customer' && body.trim().length === 0) {
            toast.error({ de: 'Bitte einen Text schreiben.', en: 'Please write a short review.' }[locale]);
            return;
        }
        if (needsLowRatingAnswers && whatWentWrong.trim().length === 0) {
            toast.error({ de: 'Bitte kurz beschreiben, was nicht gut lief.', en: 'Please briefly describe what went wrong.' }[locale]);
            return;
        }
        setBusy(true);
        try {
            if (role === 'customer') {
                const result = await createCustomer({
                    input: { bookingRequestOfferId, body: body.trim(), rating },
                });
                if (result.error || !result.data?.user.bookingRequestOfferTestimonialCreate.success) {
                    toast.error({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }[locale]);
                    return;
                }
            } else {
                const result = await createCook({
                    input: {
                        bookingRequestOfferId,
                        body: body.trim() || null,
                        rating,
                        lowRatingAnswers: needsLowRatingAnswers
                            ? {
                                  whatWentWrong: whatWentWrong.trim(),
                                  wouldRecommend,
                                  additionalFeedback: additionalFeedback.trim() || null,
                              }
                            : null,
                    },
                });
                if (result.error || !result.data?.user.cook.bookingRequestOfferTestimonialCreate.success) {
                    toast.error({ de: 'Speichern fehlgeschlagen.', en: 'Could not save.' }[locale]);
                    return;
                }
            }
            setSubmittedBody(body.trim());
            toast.success({ de: 'Danke für deine Bewertung!', en: 'Thanks for your review!' }[locale]);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="grid max-w-xl gap-5">
            <div className="grid gap-1">
                <h2 className="text-base font-medium text-foreground">{{ de: 'Bewertung abgeben', en: 'Leave a review' }[locale]}</h2>
                <p className="text-sm text-muted-foreground">
                    {role === 'customer'
                        ? {
                              de: 'Wie war dein Event? Eine kurze Bewertung hilft anderen Gästen.',
                              en: 'How was your event? A short review helps other guests.',
                          }[locale]
                        : {
                              de: 'Wie war die Zusammenarbeit mit dem Gast?',
                              en: 'How was working with the guest?',
                          }[locale]}
                </p>
            </div>

            <div className="grid gap-2">
                <span className="text-sm font-medium text-foreground">{{ de: 'Sterne', en: 'Stars' }[locale]}</span>
                <TestimonialRatingInput value={rating} onChange={setRating} size="lg" />
            </div>

            <div className="grid gap-2">
                <label htmlFor="testimonial-body" className="text-sm font-medium text-foreground">
                    {role === 'customer'
                        ? { de: 'Dein Text', en: 'Your review' }[locale]
                        : { de: 'Kommentar (optional)', en: 'Comment (optional)' }[locale]}
                </label>
                <Textarea
                    id="testimonial-body"
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    rows={4}
                    placeholder={
                        role === 'customer'
                            ? { de: 'Wie war dein Event?', en: 'How was your event?' }[locale]
                            : { de: 'Optionaler Kommentar', en: 'Optional comment' }[locale]
                    }
                />
            </div>

            {needsLowRatingAnswers ? (
                <div className="grid gap-3 rounded-lg border border-border bg-muted/30 p-4">
                    <p className="text-sm font-medium text-foreground">
                        {{ de: 'Hilf uns, uns zu verbessern', en: 'Help us improve' }[locale]}
                    </p>
                    <div className="grid gap-2">
                        <label htmlFor="what-went-wrong" className="text-sm text-muted-foreground">
                            {{ de: 'Was ist nicht gut gelaufen?', en: 'What went wrong?' }[locale]}
                        </label>
                        <Textarea
                            id="what-went-wrong"
                            value={whatWentWrong}
                            onChange={(event) => setWhatWentWrong(event.target.value)}
                            rows={3}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                            {{ de: 'Würdest du peopleeat weiterempfehlen?', en: 'Would you recommend peopleeat?' }[locale]}
                        </span>
                        <Button
                            type="button"
                            size="sm"
                            variant={wouldRecommend === true ? 'default' : 'outline'}
                            onClick={() => setWouldRecommend(true)}
                        >
                            {{ de: 'Ja', en: 'Yes' }[locale]}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={wouldRecommend === false ? 'default' : 'outline'}
                            onClick={() => setWouldRecommend(false)}
                        >
                            {{ de: 'Nein', en: 'No' }[locale]}
                        </Button>
                    </div>
                    <div className="grid gap-2">
                        <label htmlFor="additional-feedback" className="text-sm text-muted-foreground">
                            {{ de: 'Weiteres Feedback (optional)', en: 'Additional feedback (optional)' }[locale]}
                        </label>
                        <Textarea
                            id="additional-feedback"
                            value={additionalFeedback}
                            onChange={(event) => setAdditionalFeedback(event.target.value)}
                            rows={2}
                        />
                    </div>
                </div>
            ) : null}

            <div>
                <Button type="button" disabled={busy} onClick={() => void submit()}>
                    {{ de: 'Absenden', en: 'Submit' }[locale]}
                </Button>
            </div>
        </div>
    );
}
