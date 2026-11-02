import type { TestimonialPublicationStatus } from '../domain/testimonial';

/**
 * Reputation-management gate: a low self-reported rating (<= 3) does not
 * auto-publish. Admin reviews the raw feedback (and, for cooks,
 * `lowRatingAnswers`) before deciding whether to surface it. `rating == null`
 * (legacy rows without stars) publishes immediately — there is nothing to review.
 * Callers must already reject `0` / null / out-of-range via `testimonialRatingAssertRequired`.
 */
export function publicationStatusFromRating(rating: number | null | undefined): TestimonialPublicationStatus {
    if (rating != null && rating <= 3) {
        return 'PENDING_REVIEW';
    }
    return 'PUBLISHED';
}
