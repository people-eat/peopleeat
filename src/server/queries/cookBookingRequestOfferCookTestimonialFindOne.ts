import { eq } from 'drizzle-orm';

import { cookTestimonials } from '../db/schema';
import type { ServerRuntime } from '../domain/ServerRuntime';
import type { GqlSCookBookingRequestOffer, GqlSCookTestimonial } from '../graphql/generated';
import { toGqlCookTestimonial } from '../mappers/toGqlCookTestimonial';
import { testimonialOfferFallbacksLoad } from '../utils/testimonialOfferFallbacksLoad';

/**
 * `CookBookingRequestOffer.cookTestimonial` — the cook's own platform
 * testimonial for this offer, regardless of `publicationStatus`.
 */
export async function cookBookingRequestOfferCookTestimonialFindOne(
    parent: GqlSCookBookingRequestOffer,
    serverRuntime: ServerRuntime,
): Promise<GqlSCookTestimonial | null> {
    const [row] = await serverRuntime.db
        .select()
        .from(cookTestimonials)
        .where(eq(cookTestimonials.bookingRequestOfferId, parent.bookingRequestOfferId))
        .limit(1);
    if (!row) return null;

    const fallbacksByOfferId = await testimonialOfferFallbacksLoad(serverRuntime.db, [parent.bookingRequestOfferId], 'cook');
    return toGqlCookTestimonial(row, fallbacksByOfferId.get(parent.bookingRequestOfferId) ?? null);
}
