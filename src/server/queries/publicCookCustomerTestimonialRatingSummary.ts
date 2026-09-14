import { and, avg, count, eq } from 'drizzle-orm';

import { bookingRequestOffers, customerTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSPublicCookRating } from '../graphql/generated';

/** Aggregate published customer-review rating for a cook (public listing + cook self-preview). */
export async function publicCookCustomerTestimonialRatingSummary(
    cookId: string,
    serverRuntime: ServerRuntime,
): Promise<GqlSPublicCookRating> {
    const [row] = await serverRuntime.db
        .select({
            reviewCount: count(customerTestimonials.customerTestimonialId),
            averageRating: avg(customerTestimonials.rating),
        })
        .from(customerTestimonials)
        .innerJoin(bookingRequestOffers, eq(bookingRequestOffers.bookingRequestOfferId, customerTestimonials.bookingRequestOfferId))
        .where(and(eq(bookingRequestOffers.cookId, cookId), eq(customerTestimonials.publicationStatus, 'PUBLISHED')));

    return {
        reviewCount: row?.reviewCount ?? 0,
        averageRating: row?.averageRating != null ? Number(row.averageRating) : null,
    };
}
