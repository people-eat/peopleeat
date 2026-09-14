/**
 * Testimonial domain vocabulary — enums and JSONB shapes for
 * `CustomerTestimonials` / `CookTestimonials` / `CityTestimonials` /
 * `PartnerTestimonials` / `OccasionTestimonials`. See
 * `docs/architecture/testimonials.md`.
 */

const testimonialPublicationStatuses = ['PUBLISHED', 'PENDING_REVIEW'] as const;
export type TestimonialPublicationStatus = (typeof testimonialPublicationStatuses)[number];

const testimonialTypes = ['COOK', 'CUSTOMER'] as const;
export type TestimonialType = (typeof testimonialTypes)[number];

/**
 * Follow-up survey captured when a cook's platform-satisfaction rating is low
 * (`publicationStatusFromRating`). Keeps the raw feedback for admin review
 * instead of silently discarding it — see `publicationStatusFromRating.ts`.
 */
export type CookTestimonialLowRatingAnswers = {
    whatWentWrong?: string;
    wouldRecommend?: boolean;
    additionalFeedback?: string;
};
