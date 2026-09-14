import type { CustomerTestimonial } from '../db/schema';
import type { GqlSAdminCustomerTestimonial, GqlSAdminUser } from '../graphql/generated';
import type { TestimonialOfferFallbacks } from '../utils/testimonialOfferFallbacksLoad';

export function toGqlAdminCustomerTestimonial(
    row: CustomerTestimonial,
    fallbacks: TestimonialOfferFallbacks | null = null,
): GqlSAdminCustomerTestimonial {
    return {
        gqlTypeName: 'AdminCustomerTestimonial',
        customerTestimonialId: row.customerTestimonialId,
        userId: row.userId,
        // Populated by the `AdminCustomerTestimonial.user` field resolver.
        user: undefined as unknown as GqlSAdminUser,
        bookingRequestOfferId: row.bookingRequestOfferId ?? null,
        authorName: row.authorName ?? null,
        displayAuthorName: row.authorName?.trim() || fallbacks?.authorName || '',
        location: row.location ?? null,
        displayLocation: row.location?.trim() || fallbacks?.location || null,
        occasion: row.occasion ?? null,
        displayOccasion: row.occasion?.trim() || fallbacks?.occasion || null,
        body: row.body,
        imageUrls: row.imageUrls ?? [],
        rating: row.rating ?? null,
        publicationStatus: row.publicationStatus,
        publishedAt: row.publishedAt ?? null,
        createdAt: row.createdAt,
    };
}
