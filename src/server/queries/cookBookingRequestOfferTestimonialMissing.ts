import { eq } from 'drizzle-orm';

import { cookTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCookBookingRequestOffer } from '../graphql/generated';

/**
 * `CookBookingRequestOffer.testimonialMissing` — true once the offer is
 * `COMPLETED` (derived status, already on `parent`) and the cook has not
 * submitted their platform testimonial yet. Drives the "leave a review" prompt.
 */
export async function cookBookingRequestOfferTestimonialMissing(
    parent: GqlSCookBookingRequestOffer,
    serverRuntime: ServerRuntime,
): Promise<boolean> {
    if (parent.status !== 'COMPLETED') return false;

    const [existing] = await serverRuntime.db
        .select({ cookTestimonialId: cookTestimonials.cookTestimonialId })
        .from(cookTestimonials)
        .where(eq(cookTestimonials.bookingRequestOfferId, parent.bookingRequestOfferId))
        .limit(1);

    return !existing;
}
