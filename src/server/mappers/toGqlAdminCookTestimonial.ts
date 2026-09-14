import type { CookTestimonial } from '../db/schema';
import type { GqlSAdminCook, GqlSAdminCookTestimonial } from '../graphql/generated';
import type { TestimonialOfferFallbacks } from '../utils/testimonialOfferFallbacksLoad';

export function toGqlAdminCookTestimonial(
    row: CookTestimonial,
    fallbacks: TestimonialOfferFallbacks | null = null,
): GqlSAdminCookTestimonial {
    return {
        gqlTypeName: 'AdminCookTestimonial',
        cookTestimonialId: row.cookTestimonialId,
        userId: row.userId,
        cookId: row.cookId,
        // Populated by the `AdminCookTestimonial.cook` field resolver.
        cook: undefined as unknown as GqlSAdminCook,
        bookingRequestOfferId: row.bookingRequestOfferId ?? null,
        authorName: row.authorName ?? null,
        displayAuthorName: row.authorName?.trim() || fallbacks?.authorName || '',
        location: row.location ?? null,
        displayLocation: row.location?.trim() || fallbacks?.location || null,
        occasion: row.occasion ?? null,
        displayOccasion: row.occasion?.trim() || fallbacks?.occasion || null,
        body: row.body ?? null,
        imageUrls: row.imageUrls ?? [],
        rating: row.rating ?? null,
        lowRatingAnswers: row.lowRatingAnswers ?? null,
        publicationStatus: row.publicationStatus,
        publishedAt: row.publishedAt ?? null,
        createdAt: row.createdAt,
    };
}
