import { eq } from 'drizzle-orm';

import { customerTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCustomerTestimonial, GqlSUserBookingRequestOffer } from '../graphql/generated';
import { toGqlCustomerTestimonial } from '../mappers/toGqlCustomerTestimonial';
import { testimonialAuthorProfilePicturesLoad } from '../utils/testimonialAuthorProfilePicturesLoad';
import { testimonialOfferFallbacksLoad } from '../utils/testimonialOfferFallbacksLoad';

/**
 * `UserBookingRequestOffer.customerTestimonial` — the customer's own review,
 * regardless of `publicationStatus` (they should see it even while
 * `PENDING_REVIEW`).
 */
export async function userBookingRequestOfferCustomerTestimonialFindOne(
    parent: GqlSUserBookingRequestOffer,
    serverRuntime: ServerRuntime,
): Promise<GqlSCustomerTestimonial | null> {
    const [row] = await serverRuntime.db
        .select()
        .from(customerTestimonials)
        .where(eq(customerTestimonials.bookingRequestOfferId, parent.bookingRequestOfferId))
        .limit(1);
    if (!row) return null;

    const [fallbacksByOfferId, authorPicturesByUserId] = await Promise.all([
        testimonialOfferFallbacksLoad(serverRuntime.db, [parent.bookingRequestOfferId], 'customer'),
        testimonialAuthorProfilePicturesLoad(serverRuntime.db, [row.userId]),
    ]);
    return toGqlCustomerTestimonial(
        row,
        fallbacksByOfferId.get(parent.bookingRequestOfferId) ?? null,
        authorPicturesByUserId.get(row.userId) ?? null,
    );
}
