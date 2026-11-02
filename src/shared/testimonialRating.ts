/** Inclusive star range for customer and cook testimonials. `0` is never valid. */
const TESTIMONIAL_RATING_MIN = 1;
const TESTIMONIAL_RATING_MAX = 5;

/** True when `rating` is an integer from 1 to 5. */
export function isTestimonialRating(rating: unknown): rating is number {
    return typeof rating === 'number' && Number.isInteger(rating) && rating >= TESTIMONIAL_RATING_MIN && rating <= TESTIMONIAL_RATING_MAX;
}

/**
 * Normalize an optional testimonial rating for persistence.
 * `null` / `undefined` → `null`. Invalid values (including `0`) → `undefined`.
 */
export function testimonialRatingNormalize(rating: number | null | undefined): number | null | undefined {
    if (rating == null) return null;
    if (!isTestimonialRating(rating)) return undefined;
    return rating;
}

/** Optional rating: omit / null stays null; otherwise must be an integer 1–5. */
export function testimonialRatingAssertOptional(rating: number | null | undefined, errorPrefix: string): number | null {
    const normalized = testimonialRatingNormalize(rating);
    if (normalized === undefined) {
        throw new Error(`${errorPrefix}: rating must be an integer from ${TESTIMONIAL_RATING_MIN} to ${TESTIMONIAL_RATING_MAX}`);
    }
    return normalized;
}

/** Required rating for self-service offer reviews: integer 1–5. */
export function testimonialRatingAssertRequired(rating: number | null | undefined, errorPrefix: string): number {
    const normalized = testimonialRatingAssertOptional(rating, errorPrefix);
    if (normalized == null) {
        throw new Error(`${errorPrefix}: rating is required`);
    }
    return normalized;
}
