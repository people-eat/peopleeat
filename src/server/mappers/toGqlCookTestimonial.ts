import type { CookTestimonial } from '../db/schema';
import type { GqlSCookTestimonial, GqlSFileUpload } from '../graphql/generated';
import type { TestimonialOfferFallbacks } from '../utils/testimonialOfferFallbacksLoad';

/**
 * Public shape — callers must only pass `PUBLISHED` rows. Empty/whitespace
 * `authorName` / `location` / `occasion` fall back to the linked offer (see
 * `testimonialOfferFallbacksLoad.ts`) since the public type has no separate
 * `display*` fields.
 */
export function toGqlCookTestimonial(
    row: CookTestimonial,
    fallbacks: TestimonialOfferFallbacks | null = null,
    authorProfilePicture: GqlSFileUpload | null = null,
): GqlSCookTestimonial {
    return {
        gqlTypeName: 'CookTestimonial',
        cookTestimonialId: row.cookTestimonialId,
        authorName: row.authorName?.trim() || fallbacks?.authorName || '',
        authorProfilePicture,
        location: row.location?.trim() || fallbacks?.location || null,
        occasion: row.occasion?.trim() || fallbacks?.occasion || null,
        body: row.body ?? null,
        imageUrls: row.imageUrls ?? [],
        rating: row.rating ?? null,
        publishedAt: row.publishedAt ?? null,
        createdAt: row.createdAt,
    };
}
