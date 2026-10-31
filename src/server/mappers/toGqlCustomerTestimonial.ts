import type { CustomerTestimonial } from '../db/schema';
import type { GqlSCustomerTestimonial, GqlSFileUpload } from '../graphql/generated';
import type { TestimonialOfferFallbacks } from '../utils/testimonialOfferFallbacksLoad';

/**
 * Public shape — callers must only pass `PUBLISHED` rows. Empty/whitespace
 * `authorName` / `location` / `occasion` fall back to the linked offer (see
 * `testimonialOfferFallbacksLoad.ts`) since the public type has no separate
 * `display*` fields.
 */
export function toGqlCustomerTestimonial(
    row: CustomerTestimonial,
    fallbacks: TestimonialOfferFallbacks | null = null,
    authorProfilePicture: GqlSFileUpload | null = null,
): GqlSCustomerTestimonial {
    return {
        gqlTypeName: 'CustomerTestimonial',
        customerTestimonialId: row.customerTestimonialId,
        authorName: row.authorName?.trim() || fallbacks?.authorName || '',
        authorProfilePicture,
        location: row.location?.trim() || fallbacks?.location || null,
        occasion: row.occasion?.trim() || fallbacks?.occasion || null,
        body: row.body,
        imageUrls: row.imageUrls ?? [],
        rating: row.rating ?? null,
        publishedAt: row.publishedAt ?? null,
        createdAt: row.createdAt,
    };
}
