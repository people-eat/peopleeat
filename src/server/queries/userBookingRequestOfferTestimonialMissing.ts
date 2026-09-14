import { eq } from 'drizzle-orm';

import { customerTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSUserBookingRequestOffer } from '../graphql/generated';

/**
 * `UserBookingRequestOffer.testimonialMissing` — true once the offer is
 * `COMPLETED` (derived status, already on `parent`) and the customer has not
 * submitted a review yet. Drives the "leave a review" prompt.
 */
export async function userBookingRequestOfferTestimonialMissing(
    parent: GqlSUserBookingRequestOffer,
    serverRuntime: ServerRuntime,
): Promise<boolean> {
    if (parent.status !== 'COMPLETED') return false;

    const [existing] = await serverRuntime.db
        .select({ customerTestimonialId: customerTestimonials.customerTestimonialId })
        .from(customerTestimonials)
        .where(eq(customerTestimonials.bookingRequestOfferId, parent.bookingRequestOfferId))
        .limit(1);

    return !existing;
}
