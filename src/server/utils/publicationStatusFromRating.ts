import type { TestimonialPublicationStatus } from '../domain/testimonial';

/**
 * Reputation-management gate: a low self-reported rating (<= 3) does not
 * auto-publish. Admin reviews the raw feedback (and, for cooks,
 * `lowRatingAnswers`) before deciding whether to surface it. `rating == null`
 * (no star given) publishes immediately — there is nothing to review.
 */
export function publicationStatusFromRating(rating: number | null | undefined): TestimonialPublicationStatus {
    if (rating != null && rating <= 3) {
        return 'PENDING_REVIEW';
    }
    return 'PUBLISHED';
}
