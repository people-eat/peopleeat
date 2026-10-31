import { and, desc, eq } from 'drizzle-orm';

import { bookingRequestOffers, customerTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCustomerTestimonial, GqlSPublicCook } from '../graphql/generated';
import { toGqlCustomerTestimonial } from '../mappers/toGqlCustomerTestimonial';
import { testimonialAuthorProfilePicturesLoad } from '../utils/testimonialAuthorProfilePicturesLoad';
import { testimonialOfferFallbacksLoad } from '../utils/testimonialOfferFallbacksLoad';

/** `PublicCook.testimonials` — published customer reviews tied to one of this cook's offers. */
export async function publicCookCustomerTestimonialsFindMany(
    parent: GqlSPublicCook,
    serverRuntime: ServerRuntime,
): Promise<GqlSCustomerTestimonial[]> {
    const rows = await serverRuntime.db
        .select({ testimonial: customerTestimonials })
        .from(customerTestimonials)
        .innerJoin(bookingRequestOffers, eq(bookingRequestOffers.bookingRequestOfferId, customerTestimonials.bookingRequestOfferId))
        .where(and(eq(bookingRequestOffers.cookId, parent.cookId), eq(customerTestimonials.publicationStatus, 'PUBLISHED')))
        .orderBy(desc(customerTestimonials.createdAt));

    const offerIds = rows.flatMap((row) => (row.testimonial.bookingRequestOfferId ? [row.testimonial.bookingRequestOfferId] : []));
    const [fallbacksByOfferId, authorPicturesByUserId] = await Promise.all([
        testimonialOfferFallbacksLoad(serverRuntime.db, offerIds, 'customer'),
        testimonialAuthorProfilePicturesLoad(
            serverRuntime.db,
            rows.map((row) => row.testimonial.userId),
        ),
    ]);

    return rows.map((row) =>
        toGqlCustomerTestimonial(
            row.testimonial,
            row.testimonial.bookingRequestOfferId ? (fallbacksByOfferId.get(row.testimonial.bookingRequestOfferId) ?? null) : null,
            authorPicturesByUserId.get(row.testimonial.userId) ?? null,
        ),
    );
}
